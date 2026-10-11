import logging
import uuid
from datetime import datetime, timezone
from backend.config import Config

logger = logging.getLogger(__name__)

# In-Memory Mock Store for offline testing / development when credentials are unset
class MockDataStore:
    def __init__(self):
        self.reset()

    def reset(self):
        self.profiles = []
        self.tasks = []
        self.activity_logs = []
        self.notifications = []
        self.email_outbox = []

# Singleton instance for mock store
mock_store = MockDataStore()

class MockQueryBuilder:
    def __init__(self, table_name, store):
        self.table_name = table_name
        self.store = store
        self.collection = getattr(store, table_name, [])
        self._filters = []
        self._order_field = None
        self._order_desc = False
        self._limit = None
        self._offset = None
        self._select_fields = "*"

    def select(self, fields="*"):
        self._select_fields = fields
        return self

    def eq(self, column, value):
        self._filters.append(lambda row: str(row.get(column)) == str(value))
        return self

    def neq(self, column, value):
        self._filters.append(lambda row: str(row.get(column)) != str(value))
        return self

    def in_(self, column, values):
        val_strs = [str(v) for v in values]
        self._filters.append(lambda row: str(row.get(column)) in val_strs)
        return self

    def ilike(self, column, pattern):
        raw = pattern.replace("%", "").lower()
        self._filters.append(lambda row: raw in str(row.get(column, "")).lower())
        return self

    def lte(self, column, value):
        self._filters.append(lambda row: str(row.get(column, "")) <= str(value) if row.get(column) else False)
        return self

    def gte(self, column, value):
        self._filters.append(lambda row: str(row.get(column, "")) >= str(value) if row.get(column) else False)
        return self

    def order(self, column, desc=False):
        self._order_field = column
        self._order_desc = desc
        return self

    def limit(self, count):
        self._limit = count
        return self

    def range(self, start, end):
        self._offset = start
        self._limit = (end - start + 1)
        return self

    def execute(self):
        results = list(self.collection)
        for f in self._filters:
            results = [r for r in results if f(r)]

        if self._order_field:
            results.sort(
                key=lambda r: (r.get(self._order_field) is None, r.get(self._order_field, "")),
                reverse=self._order_desc
            )

        if self._offset is not None:
            results = results[self._offset:]
        if self._limit is not None:
            results = results[:self._limit]

        class Response:
            def __init__(self, data):
                self.data = [dict(d) for d in data]
                self.count = len(data)
        return Response(results)

    def insert(self, values):
        if isinstance(values, dict):
            values = [values]
        inserted = []
        now = datetime.now(timezone.utc).isoformat()
        for item in values:
            record = dict(item)
            if "id" not in record or not record["id"]:
                record["id"] = str(uuid.uuid4())
            if "created_at" not in record:
                record["created_at"] = now
            if "updated_at" not in record:
                record["updated_at"] = now
            self.collection.append(record)
            inserted.append(record)

        class Response:
            def __init__(self, data):
                self.data = [dict(d) for d in data]
        return MockExecuteHelper(Response(inserted))

    def update(self, values):
        self._update_values = values
        return self

    def delete(self):
        self._is_delete = True
        return self

class MockExecuteHelper:
    def __init__(self, response):
        self.response = response

    def execute(self):
        return self.response

class MockTableProxy:
    def __init__(self, table_name, store):
        self.table_name = table_name
        self.store = store

    def select(self, fields="*"):
        builder = MockQueryBuilder(self.table_name, self.store)
        return builder.select(fields)

    def insert(self, values):
        builder = MockQueryBuilder(self.table_name, self.store)
        return builder.insert(values)

    def update(self, values):
        builder = MockQueryBuilder(self.table_name, self.store)
        builder._update_values = values
        builder_self = builder
        
        # Override execute for update
        orig_execute = builder.execute
        def execute_update():
            results = orig_execute().data
            now = datetime.now(timezone.utc).isoformat()
            updated_list = []
            for item in builder_self.collection:
                for target in results:
                    if str(item.get("id")) == str(target.get("id")):
                        item.update(builder_self._update_values)
                        item["updated_at"] = now
                        updated_list.append(dict(item))
            class Response:
                def __init__(self, data):
                    self.data = data
            return Response(updated_list)
        builder.execute = execute_update
        return builder

    def delete(self):
        builder = MockQueryBuilder(self.table_name, self.store)
        builder_self = builder
        orig_execute = builder.execute
        def execute_delete():
            targets = orig_execute().data
            target_ids = {str(t.get("id")) for t in targets}
            builder_self.store.__dict__[builder_self.table_name] = [
                r for r in builder_self.collection if str(r.get("id")) not in target_ids
            ]
            class Response:
                def __init__(self, data):
                    self.data = targets
            return Response(targets)
        builder.execute = execute_delete
        return builder

class MockSupabaseClient:
    def __init__(self, store):
        self.store = store

    def table(self, table_name):
        return MockTableProxy(table_name, self.store)

    def from_(self, table_name):
        return self.table(table_name)

# Client factory
_supabase_client = None

def get_supabase_client():
    global _supabase_client
    if _supabase_client is not None:
        return _supabase_client

    if not Config.USE_MOCK_DB and Config.SUPABASE_URL and Config.SUPABASE_SERVICE_ROLE_KEY:
        try:
            from supabase import create_client, ClientOptions
            _supabase_client = create_client(
                Config.SUPABASE_URL,
                Config.SUPABASE_SERVICE_ROLE_KEY
            )
            logger.info("Connected to live Supabase backend at %s", Config.SUPABASE_URL)
            return _supabase_client
        except Exception as e:
            logger.warning("Failed to initialize live Supabase client (%s). Falling back to mock store.", e)

    logger.info("Using in-memory mock data store for Supabase operations.")
    _supabase_client = MockSupabaseClient(mock_store)
    return _supabase_client


# Direct PostgreSQL connection pooling (supported alongside Supabase REST client)
_pg_pool = None

def get_pg_pool():
    global _pg_pool
    if _pg_pool is not None:
        return _pg_pool

    if Config.DATABASE_URL:
        try:
            from psycopg2 import pool
            _pg_pool = pool.ThreadedConnectionPool(
                minconn=Config.DB_POOL_MIN,
                maxconn=Config.DB_POOL_MAX,
                dsn=Config.DATABASE_URL,
            )
            logger.info("Direct PostgreSQL connection pool initialized.")
            return _pg_pool
        except Exception as e:
            logger.warning("Failed to initialize PostgreSQL pool (%s). Direct pool unavailable.", e)
            return None
    return None


def check_direct_pg_connection():
    """
    Test direct PostgreSQL connection without exposing credentials.
    Returns: (is_connected: bool, details: dict)
    """
    if not Config.DATABASE_URL:
        return False, {"configured": False, "message": "DATABASE_URL not set in environment (using Supabase REST client)."}

    try:
        pool_inst = get_pg_pool()
        if pool_inst:
            conn = pool_inst.getconn()
            try:
                with conn.cursor() as cur:
                    cur.execute("SELECT 1;")
                    cur.fetchone()
                    # Check schema_migrations table
                    cur.execute("""
                        SELECT count(*) FROM information_schema.tables 
                        WHERE table_schema = 'public' AND table_name = 'schema_migrations';
                    """)
                    has_mig_table = bool(cur.fetchone()[0])
                    applied_count = 0
                    if has_mig_table:
                        cur.execute("SELECT count(*) FROM public.schema_migrations;")
                        applied_count = cur.fetchone()[0]

                return True, {
                    "configured": True,
                    "connected": True,
                    "pooling_enabled": True,
                    "min_connections": Config.DB_POOL_MIN,
                    "max_connections": Config.DB_POOL_MAX,
                    "schema_migrations_table": has_mig_table,
                    "applied_migrations_count": applied_count,
                }
            finally:
                pool_inst.putconn(conn)
    except Exception as e:
        return False, {
            "configured": True,
            "connected": False,
            "error": "Connection failed"
        }

    return False, {"configured": False, "message": "PostgreSQL pool unavailable."}
