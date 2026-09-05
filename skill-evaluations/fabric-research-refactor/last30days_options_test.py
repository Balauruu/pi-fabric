"""Native option smoke, not a research adapter or date validator.
Run with skills/last30days/.venv/bin/python -B from the Fabric profile.
"""
import sys
import unittest
from pathlib import Path

PROFILE = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROFILE / 'skills/last30days/skills/last30days/scripts'))
import last30days as engine


class ExistingOptions(unittest.TestCase):
    def test_defaults_are_left_to_engine(self):
        args = engine.build_parser().parse_args(['SQLite', '--emit=json'])
        self.assertIsNone(args.lookback_days)
        self.assertIsNone(args.as_of_date)
        self.assertFalse(args.quick)
        self.assertFalse(args.deep)
        self.assertEqual(args.json_profile, 'agent')

    def test_explicit_options_survive(self):
        for depth in ('quick', 'deep'):
            with self.subTest(depth=depth):
                args = engine.build_parser().parse_args([
                    'SQLite', '--days', '12', '--as-of', '2026-05-31',
                    '--' + depth, '--emit=json', '--json-profile=agent',
                    '--no-browser-cookies', '--search', 'hackernews',
                ])
                self.assertEqual(args.lookback_days, 12)
                self.assertEqual(args.as_of_date, '2026-05-31')
                self.assertTrue(getattr(args, depth))
                self.assertFalse(getattr(args, 'deep' if depth == 'quick' else 'quick'))
                self.assertTrue(args.no_browser_cookies)
                self.assertEqual(args.search, 'hackernews')
                self.assertEqual(args.json_profile, 'agent')


if __name__ == '__main__':
    unittest.main()
