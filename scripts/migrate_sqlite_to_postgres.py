#!/usr/bin/env python3
"""
SQLite to PostgreSQL Migration Script for Reforge

This script migrates data from SQLite to PostgreSQL 18 with UUID primary keys.
It handles:
- Converting INTEGER primary keys to UUIDs
- Migrating foreign key relationships
- Converting SQLite datetime to PostgreSQL TIMESTAMPTZ
- Preserving all data integrity

Usage:
    python3 migrate_sqlite_to_postgres.py \
        --sqlite-db /path/to/reforge.db \
        --postgres-url "postgresql://user:password@localhost:5432/reforge"

Requirements:
    pip install psycopg2-binary
"""

import argparse
import sqlite3
import sys
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

try:
    import psycopg2
    from psycopg2 import sql
    from psycopg2.extensions import AsIs
except ImportError:
    print("Error: psycopg2 is required. Install with: pip install psycopg2-binary")
    sys.exit(1)


class MigrationStats:
    def __init__(self):
        self.users = 0
        self.invite_codes = 0
        self.patterns = 0
        self.problems = 0
        self.problem_patterns = 0
        self.sessions = 0
        self.session_problems = 0
        self.attempts = 0
        self.user_problem_stats = 0
        self.user_pattern_stats = 0
        self.errors = []

    def print_summary(self):
        print("\n" + "=" * 60)
        print("MIGRATION SUMMARY")
        print("=" * 60)
        print(f"Users:                {self.users}")
        print(f"Invite Codes:         {self.invite_codes}")
        print(f"Patterns:             {self.patterns}")
        print(f"Problems:             {self.problems}")
        print(f"Problem Patterns:     {self.problem_patterns}")
        print(f"Sessions:             {self.sessions}")
        print(f"Session Problems:     {self.session_problems}")
        print(f"Attempts:             {self.attempts}")
        print(f"User Problem Stats:   {self.user_problem_stats}")
        print(f"User Pattern Stats:   {self.user_pattern_stats}")
        print("=" * 60)
        if self.errors:
            print(f"\nERRORS: {len(self.errors)}")
            for error in self.errors[:10]:  # Show first 10 errors
                print(f"  - {error}")
            if len(self.errors) > 10:
                print(f"  ... and {len(self.errors) - 10} more errors")
        else:
            print("\n✅ Migration completed successfully with no errors!")
        print("=" * 60)


def generate_uuid() -> str:
    """Generate a new UUID v4."""
    return str(uuid.uuid4())


def parse_sqlite_datetime(dt_str: Optional[str]) -> Optional[datetime]:
    """Parse SQLite datetime string to Python datetime."""
    if not dt_str:
        return None
    try:
        # SQLite datetime format: YYYY-MM-DD HH:MM:SS
        return datetime.strptime(dt_str, "%Y-%m-%d %H:%M:%S")
    except (ValueError, TypeError):
        return None


class SQLiteToPostgresMigrator:
    def __init__(self, sqlite_path: str, postgres_url: str):
        self.sqlite_path = sqlite_path
        self.postgres_url = postgres_url
        self.stats = MigrationStats()

        # Mapping old integer IDs to new UUIDs
        self.user_id_map: Dict[int, str] = {}
        self.pattern_id_map: Dict[int, str] = {}
        self.problem_id_map: Dict[int, str] = {}
        self.session_id_map: Dict[int, str] = {}
        self.attempt_id_map: Dict[int, str] = {}
        self.invite_code_id_map: Dict[int, str] = {}

    def connect_sqlite(self) -> sqlite3.Connection:
        """Connect to SQLite database."""
        try:
            conn = sqlite3.connect(self.sqlite_path)
            conn.row_factory = sqlite3.Row
            print(f"✅ Connected to SQLite: {self.sqlite_path}")
            return conn
        except sqlite3.Error as e:
            print(f"❌ Failed to connect to SQLite: {e}")
            sys.exit(1)

    def connect_postgres(self) -> psycopg2.extensions.connection:
        """Connect to PostgreSQL database."""
        try:
            conn = psycopg2.connect(self.postgres_url)
            print(f"✅ Connected to PostgreSQL")
            return conn
        except psycopg2.Error as e:
            print(f"❌ Failed to connect to PostgreSQL: {e}")
            sys.exit(1)

    def clear_postgres_tables(self, pg_conn: psycopg2.extensions.connection):
        """Clear all data from PostgreSQL tables (for clean migration)."""
        print("\n🗑️  Clearing existing PostgreSQL data...")
        cursor = pg_conn.cursor()

        tables = [
            "user_pattern_stats",
            "user_problem_stats",
            "attempts",
            "session_problems",
            "sessions",
            "problem_patterns",
            "problems",
            "patterns",
            "invite_codes",
            "users",
        ]

        try:
            for table in tables:
                cursor.execute(f"DELETE FROM {table}")
                print(f"  Cleared {table}")
            pg_conn.commit()
            print("✅ All tables cleared")
        except psycopg2.Error as e:
            print(f"❌ Failed to clear tables: {e}")
            pg_conn.rollback()
            raise

    def migrate_users(
        self, sqlite_conn: sqlite3.Connection, pg_conn: psycopg2.extensions.connection
    ):
        """Migrate users table."""
        print("\n📦 Migrating users...")
        cursor = pg_conn.cursor()

        sqlite_cursor = sqlite_conn.cursor()
        sqlite_cursor.execute("SELECT * FROM users ORDER BY id")

        for row in sqlite_cursor.fetchall():
            old_id = row["id"]
            new_id = generate_uuid()
            self.user_id_map[old_id] = new_id

            try:
                cursor.execute(
                    """
                    INSERT INTO users (id, username, email, password_hash, role, is_active, created_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                """,
                    (
                        new_id,
                        row["username"],
                        row["email"],
                        row["password_hash"],
                        row["role"] or "user",
                        bool(row["is_active"]),
                        parse_sqlite_datetime(row["created_at"]) or datetime.utcnow(),
                    ),
                )
                self.stats.users += 1
            except psycopg2.Error as e:
                self.stats.errors.append(f"User {row['username']}: {e}")
                pg_conn.rollback()
                continue

        pg_conn.commit()
        print(f"✅ Migrated {self.stats.users} users")

    def migrate_invite_codes(
        self, sqlite_conn: sqlite3.Connection, pg_conn: psycopg2.extensions.connection
    ):
        """Migrate invite_codes table."""
        print("\n📦 Migrating invite codes...")
        cursor = pg_conn.cursor()

        sqlite_cursor = sqlite_conn.cursor()
        sqlite_cursor.execute("SELECT * FROM invite_codes ORDER BY id")

        for row in sqlite_cursor.fetchall():
            old_id = row["id"]
            new_id = generate_uuid()
            self.invite_code_id_map[old_id] = new_id

            # Map creator_id
            creator_id = None
            if row["created_by_user_id"]:
                creator_id = self.user_id_map.get(row["created_by_user_id"])

            try:
                cursor.execute(
                    """
                    INSERT INTO invite_codes (id, code, created_by_user_id, is_used, created_at, used_at)
                    VALUES (%s, %s, %s, %s, %s, %s)
                """,
                    (
                        new_id,
                        row["code"],
                        creator_id,
                        bool(row["is_used"]),
                        parse_sqlite_datetime(row["created_at"]) or datetime.utcnow(),
                        parse_sqlite_datetime(row["used_at"]),
                    ),
                )
                self.stats.invite_codes += 1
            except psycopg2.Error as e:
                self.stats.errors.append(f"Invite code {row['code']}: {e}")
                pg_conn.rollback()
                continue

        pg_conn.commit()
        print(f"✅ Migrated {self.stats.invite_codes} invite codes")

    def migrate_patterns(
        self, sqlite_conn: sqlite3.Connection, pg_conn: psycopg2.extensions.connection
    ):
        """Migrate patterns table."""
        print("\n📦 Migrating patterns...")
        cursor = pg_conn.cursor()

        sqlite_cursor = sqlite_conn.cursor()
        sqlite_cursor.execute("SELECT * FROM patterns ORDER BY id")

        for row in sqlite_cursor.fetchall():
            old_id = row["id"]
            new_id = generate_uuid()
            self.pattern_id_map[old_id] = new_id

            try:
                cursor.execute(
                    """
                    INSERT INTO patterns (id, title, description, created_at)
                    VALUES (%s, %s, %s, %s)
                """,
                    (
                        new_id,
                        row["title"],
                        row["description"],
                        parse_sqlite_datetime(row["created_at"]) or datetime.utcnow(),
                    ),
                )
                self.stats.patterns += 1
            except psycopg2.Error as e:
                self.stats.errors.append(f"Pattern {row['title']}: {e}")
                pg_conn.rollback()
                continue

        pg_conn.commit()
        print(f"✅ Migrated {self.stats.patterns} patterns")

    def migrate_problems(
        self, sqlite_conn: sqlite3.Connection, pg_conn: psycopg2.extensions.connection
    ):
        """Migrate problems table."""
        print("\n📦 Migrating problems...")
        cursor = pg_conn.cursor()

        sqlite_cursor = sqlite_conn.cursor()
        sqlite_cursor.execute("SELECT * FROM problems ORDER BY id")

        for row in sqlite_cursor.fetchall():
            old_id = row["id"]
            new_id = generate_uuid()
            self.problem_id_map[old_id] = new_id

            try:
                cursor.execute(
                    """
                    INSERT INTO problems (id, title, source, url, difficulty, created_at)
                    VALUES (%s, %s, %s, %s, %s, %s)
                """,
                    (
                        new_id,
                        row["title"],
                        row["source"],
                        row["url"],
                        row["difficulty"],
                        parse_sqlite_datetime(row["created_at"]) or datetime.utcnow(),
                    ),
                )
                self.stats.problems += 1
            except psycopg2.Error as e:
                self.stats.errors.append(f"Problem {row['title']}: {e}")
                pg_conn.rollback()
                continue

        pg_conn.commit()
        print(f"✅ Migrated {self.stats.problems} problems")

    def migrate_problem_patterns(
        self, sqlite_conn: sqlite3.Connection, pg_conn: psycopg2.extensions.connection
    ):
        """Migrate problem_patterns junction table."""
        print("\n📦 Migrating problem-pattern relationships...")
        cursor = pg_conn.cursor()

        sqlite_cursor = sqlite_conn.cursor()
        sqlite_cursor.execute("SELECT * FROM problem_patterns")

        for row in sqlite_cursor.fetchall():
            problem_id = self.problem_id_map.get(row["problem_id"])
            pattern_id = self.pattern_id_map.get(row["pattern_id"])

            if not problem_id or not pattern_id:
                self.stats.errors.append(
                    f"Missing mapping for problem_pattern: {row['problem_id']}-{row['pattern_id']}"
                )
                continue

            try:
                cursor.execute(
                    """
                    INSERT INTO problem_patterns (problem_id, pattern_id)
                    VALUES (%s, %s)
                """,
                    (problem_id, pattern_id),
                )
                self.stats.problem_patterns += 1
            except psycopg2.Error as e:
                self.stats.errors.append(f"Problem-Pattern link: {e}")
                pg_conn.rollback()
                continue

        pg_conn.commit()
        print(
            f"✅ Migrated {self.stats.problem_patterns} problem-pattern relationships"
        )

    def migrate_sessions(
        self, sqlite_conn: sqlite3.Connection, pg_conn: psycopg2.extensions.connection
    ):
        """Migrate sessions table."""
        print("\n📦 Migrating sessions...")
        cursor = pg_conn.cursor()

        sqlite_cursor = sqlite_conn.cursor()
        sqlite_cursor.execute("SELECT * FROM sessions ORDER BY id")

        for row in sqlite_cursor.fetchall():
            old_id = row["id"]
            new_id = generate_uuid()
            self.session_id_map[old_id] = new_id

            user_id = self.user_id_map.get(row["user_id"])
            if not user_id:
                self.stats.errors.append(f"Missing user mapping for session {old_id}")
                continue

            try:
                cursor.execute(
                    """
                    INSERT INTO sessions (
                        id, user_id, title, session_type, status, 
                        total_problems, completed_problems, elapsed_time_seconds,
                        timer_state, timer_last_updated_at, started_at, completed_at, created_at
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                    (
                        new_id,
                        user_id,
                        row["title"],
                        row["session_type"],
                        row["status"],
                        row["total_problems"],
                        row["completed_problems"],
                        row["elapsed_time_seconds"],
                        row["timer_state"],
                        parse_sqlite_datetime(row["timer_last_updated_at"]),
                        parse_sqlite_datetime(row["started_at"]),
                        parse_sqlite_datetime(row["completed_at"]),
                        parse_sqlite_datetime(row["created_at"]) or datetime.utcnow(),
                    ),
                )
                self.stats.sessions += 1
            except psycopg2.Error as e:
                self.stats.errors.append(f"Session {row['title']}: {e}")
                pg_conn.rollback()
                continue

        pg_conn.commit()
        print(f"✅ Migrated {self.stats.sessions} sessions")

    def migrate_session_problems(
        self, sqlite_conn: sqlite3.Connection, pg_conn: psycopg2.extensions.connection
    ):
        """Migrate session_problems table."""
        print("\n📦 Migrating session problems...")
        cursor = pg_conn.cursor()

        sqlite_cursor = sqlite_conn.cursor()
        sqlite_cursor.execute(
            "SELECT * FROM session_problems ORDER BY session_id, order_index"
        )

        for row in sqlite_cursor.fetchall():
            session_id = self.session_id_map.get(row["session_id"])
            problem_id = self.problem_id_map.get(row["problem_id"])

            if not session_id or not problem_id:
                self.stats.errors.append(
                    f"Missing mapping for session_problem: {row['session_id']}-{row['problem_id']}"
                )
                continue

            try:
                cursor.execute(
                    """
                    INSERT INTO session_problems (session_id, problem_id, order_index, is_completed)
                    VALUES (%s, %s, %s, %s)
                """,
                    (
                        session_id,
                        problem_id,
                        row["order_index"],
                        bool(row["is_completed"]),
                    ),
                )
                self.stats.session_problems += 1
            except psycopg2.Error as e:
                self.stats.errors.append(f"Session-Problem: {e}")
                pg_conn.rollback()
                continue

        pg_conn.commit()
        print(f"✅ Migrated {self.stats.session_problems} session problems")

    def migrate_attempts(
        self, sqlite_conn: sqlite3.Connection, pg_conn: psycopg2.extensions.connection
    ):
        """Migrate attempts table."""
        print("\n📦 Migrating attempts...")
        cursor = pg_conn.cursor()

        sqlite_cursor = sqlite_conn.cursor()
        sqlite_cursor.execute("SELECT * FROM attempts ORDER BY id")

        for row in sqlite_cursor.fetchall():
            old_id = row["id"]
            new_id = generate_uuid()
            self.attempt_id_map[old_id] = new_id

            user_id = self.user_id_map.get(row["user_id"])
            problem_id = self.problem_id_map.get(row["problem_id"])

            if not user_id or not problem_id:
                self.stats.errors.append(f"Missing mapping for attempt {old_id}")
                continue

            session_id = None
            if row["session_id"]:
                session_id = self.session_id_map.get(row["session_id"])

            try:
                cursor.execute(
                    """
                    INSERT INTO attempts (
                        id, user_id, problem_id, session_id, confidence_score,
                        duration_seconds, outcome, notes, performed_at, status,
                        elapsed_time_seconds, timer_state, timer_last_updated_at, started_at
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                    (
                        new_id,
                        user_id,
                        problem_id,
                        session_id,
                        row["confidence_score"],
                        row["duration_seconds"],
                        row["outcome"],
                        row["notes"],
                        parse_sqlite_datetime(row["performed_at"]) or datetime.utcnow(),
                        row["status"] or "completed",
                        row["elapsed_time_seconds"],
                        row["timer_state"],
                        parse_sqlite_datetime(row["timer_last_updated_at"]),
                        parse_sqlite_datetime(row["started_at"]),
                    ),
                )
                self.stats.attempts += 1
            except psycopg2.Error as e:
                self.stats.errors.append(f"Attempt {old_id}: {e}")
                pg_conn.rollback()
                continue

        pg_conn.commit()
        print(f"✅ Migrated {self.stats.attempts} attempts")

    def migrate_user_problem_stats(
        self, sqlite_conn: sqlite3.Connection, pg_conn: psycopg2.extensions.connection
    ):
        """Migrate user_problem_stats table."""
        print("\n📦 Migrating user problem stats...")
        cursor = pg_conn.cursor()

        sqlite_cursor = sqlite_conn.cursor()
        sqlite_cursor.execute("SELECT * FROM user_problem_stats")

        for row in sqlite_cursor.fetchall():
            user_id = self.user_id_map.get(row["user_id"])
            problem_id = self.problem_id_map.get(row["problem_id"])

            if not user_id or not problem_id:
                self.stats.errors.append(
                    f"Missing mapping for user_problem_stats: {row['user_id']}-{row['problem_id']}"
                )
                continue

            try:
                cursor.execute(
                    """
                    INSERT INTO user_problem_stats (
                        user_id, problem_id, status, confidence, avg_confidence,
                        last_attempt_at, total_attempts, avg_time_seconds, last_outcome,
                        recent_history_json, next_review_at, interval_days, ease_factor, review_count
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                    (
                        user_id,
                        problem_id,
                        row["status"],
                        row["confidence"],
                        row["avg_confidence"],
                        parse_sqlite_datetime(row["last_attempt_at"]),
                        row["total_attempts"],
                        row["avg_time_seconds"],
                        row["last_outcome"],
                        row["recent_history_json"],
                        parse_sqlite_datetime(row["next_review_at"]),
                        row["interval_days"],
                        row["ease_factor"],
                        row["review_count"],
                    ),
                )
                self.stats.user_problem_stats += 1
            except psycopg2.Error as e:
                self.stats.errors.append(f"User-Problem Stats: {e}")
                pg_conn.rollback()
                continue

        pg_conn.commit()
        print(f"✅ Migrated {self.stats.user_problem_stats} user problem stats")

    def migrate_user_pattern_stats(
        self, sqlite_conn: sqlite3.Connection, pg_conn: psycopg2.extensions.connection
    ):
        """Migrate user_pattern_stats table."""
        print("\n📦 Migrating user pattern stats...")
        cursor = pg_conn.cursor()

        sqlite_cursor = sqlite_conn.cursor()
        sqlite_cursor.execute("SELECT * FROM user_pattern_stats")

        for row in sqlite_cursor.fetchall():
            user_id = self.user_id_map.get(row["user_id"])
            pattern_id = self.pattern_id_map.get(row["pattern_id"])

            if not user_id or not pattern_id:
                self.stats.errors.append(
                    f"Missing mapping for user_pattern_stats: {row['user_id']}-{row['pattern_id']}"
                )
                continue

            try:
                cursor.execute(
                    """
                    INSERT INTO user_pattern_stats (user_id, pattern_id, avg_confidence, times_revised)
                    VALUES (%s, %s, %s, %s)
                """,
                    (
                        user_id,
                        pattern_id,
                        row["avg_confidence"],
                        row["times_revised"],
                    ),
                )
                self.stats.user_pattern_stats += 1
            except psycopg2.Error as e:
                self.stats.errors.append(f"User-Pattern Stats: {e}")
                pg_conn.rollback()
                continue

        pg_conn.commit()
        print(f"✅ Migrated {self.stats.user_pattern_stats} user pattern stats")

    def run_migration(self):
        """Execute the full migration."""
        print("\n" + "=" * 60)
        print("🚀 STARTING SQLite → PostgreSQL MIGRATION")
        print("=" * 60)

        sqlite_conn = self.connect_sqlite()
        pg_conn = self.connect_postgres()

        try:
            # Clear existing data
            self.clear_postgres_tables(pg_conn)

            # Migrate tables in dependency order
            self.migrate_users(sqlite_conn, pg_conn)
            self.migrate_invite_codes(sqlite_conn, pg_conn)
            self.migrate_patterns(sqlite_conn, pg_conn)
            self.migrate_problems(sqlite_conn, pg_conn)
            self.migrate_problem_patterns(sqlite_conn, pg_conn)
            self.migrate_sessions(sqlite_conn, pg_conn)
            self.migrate_session_problems(sqlite_conn, pg_conn)
            self.migrate_attempts(sqlite_conn, pg_conn)
            self.migrate_user_problem_stats(sqlite_conn, pg_conn)
            self.migrate_user_pattern_stats(sqlite_conn, pg_conn)

            # Print summary
            self.stats.print_summary()

        except Exception as e:
            print(f"\n❌ Migration failed: {e}")
            pg_conn.rollback()
            raise
        finally:
            sqlite_conn.close()
            pg_conn.close()
            print("\n🔒 Database connections closed")


def main():
    parser = argparse.ArgumentParser(
        description="Migrate Reforge data from SQLite to PostgreSQL"
    )
    parser.add_argument(
        "--sqlite-db",
        required=True,
        help="Path to SQLite database file (e.g., ./reforge.db)",
    )
    parser.add_argument(
        "--postgres-url",
        required=True,
        help='PostgreSQL connection URL (e.g., "postgresql://user:password@localhost:5432/reforge")',
    )
    parser.add_argument(
        "--no-clear",
        action="store_true",
        help="Skip clearing existing PostgreSQL data (not recommended)",
    )

    args = parser.parse_args()

    # Confirmation prompt
    print("\n⚠️  WARNING: This will REPLACE all data in the PostgreSQL database!")
    print(f"   SQLite source: {args.sqlite_db}")
    print(f"   PostgreSQL target: {args.postgres_url}")

    confirm = input("\nType 'yes' to continue: ")
    if confirm.lower() != "yes":
        print("❌ Migration cancelled")
        sys.exit(0)

    migrator = SQLiteToPostgresMigrator(args.sqlite_db, args.postgres_url)
    migrator.run_migration()


if __name__ == "__main__":
    main()
