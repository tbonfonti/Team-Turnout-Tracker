import unittest

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from app.routers.admin_routes import reset_voted_statuses


class AdminResetVotedTests(unittest.TestCase):
    def setUp(self):
        engine = create_engine("sqlite:///:memory:")
        with engine.begin() as connection:
            connection.execute(
                text(
                    """
                    CREATE TABLE voters (
                        id INTEGER PRIMARY KEY,
                        has_voted BOOLEAN
                    )
                    """
                )
            )
            connection.execute(
                text(
                    """
                    INSERT INTO voters (id, has_voted)
                    VALUES (1, 1), (2, 0), (3, NULL)
                    """
                )
            )

        self.session = sessionmaker(bind=engine)()

    def tearDown(self):
        self.session.close()

    def test_reset_marks_every_voter_no_and_reports_previous_yes_count(self):
        result = reset_voted_statuses(db=self.session, current_admin=object())

        statuses = self.session.execute(
            text("SELECT has_voted FROM voters ORDER BY id")
        ).scalars().all()

        self.assertEqual(statuses, [0, 0, 0])
        self.assertEqual(result["updated_voters"], 1)
        self.assertEqual(result["status"], "ok")


if __name__ == "__main__":
    unittest.main()
