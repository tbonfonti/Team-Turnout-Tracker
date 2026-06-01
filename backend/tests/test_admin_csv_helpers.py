import unittest

from app.routers.admin_routes import clean_csv_value, get_csv_value, normalize_csv_header


class AdminCsvHelperTests(unittest.TestCase):
    def test_normalize_csv_header_accepts_common_voter_id_spellings(self):
        headers = ["voter_id", "VoterID", "VOTER_ID", "Voter ID", "\ufeffVoter ID"]

        self.assertEqual({normalize_csv_header(header) for header in headers}, {"voterid"})

    def test_get_csv_value_strips_header_bom_and_value_whitespace(self):
        row = {"\ufeffVoter ID": "\ufeff 12345 \xa0"}

        self.assertEqual(get_csv_value(row, "voter_id"), "12345")

    def test_get_csv_value_returns_empty_string_when_missing(self):
        self.assertEqual(get_csv_value({"name": "Ada"}, "voter_id"), "")

    def test_clean_csv_value_handles_none(self):
        self.assertEqual(clean_csv_value(None), "")


if __name__ == "__main__":
    unittest.main()
