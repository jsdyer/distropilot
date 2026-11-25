import json
from pathlib import Path
import sys
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from refresh import collect, normalized_packages, lifecycle, alma_lifecycle

class RefreshTests(unittest.TestCase):
    def test_lifecycle_dates_validate_and_unknown_fields_do_not_publish(self):
        rows='series,release,eol,arbitrary\n'+''.join(f'x{i},2020-01-01,2030-02-01,secret\n' for i in range(5))
        result=lifecycle(rows.encode(),'debian')
        self.assertEqual(result['x1'],{'release':'2020-01-01','eol':'2030-02-01'})
        with self.assertRaises(ValueError): lifecycle(rows.replace('2030-02-01','2030-99-99').encode(),'debian')
    def test_alma_statement_must_exist(self):
        raw=b'Version 9 will have active support until 31 May 2027, and security support until 31 May 2032.'
        self.assertEqual(alma_lifecycle(raw,9)['eol-security'],'2032-05-31')
        with self.assertRaises(ValueError): alma_lifecycle(raw,10)
    def test_source_validation_and_distinct_revisions(self):
        rows=[{'repo':'r','version':'1','origversion':'1-1'},{'repo':'r','version':'1','origversion':'1-2'},{'repo':'other','version':'2'}]
        self.assertEqual(len(normalized_packages(rows,{'r'})),2)
        with self.assertRaises(ValueError): normalized_packages([{'version':'1'}])
    def test_extra_project_is_collected_and_requests_are_spaced(self):
        config={'projects':['extra-project','second'],'repositories':[{'id':'fedora_45','label':'Fedora 45','family':'fedora'}],'default_projects':['extra-project'],'default_repositories':['fedora_45'],'max_projects':30,'max_repositories':6,'api_base':''}
        calls=[];waits=[]
        def fetch(url):
            calls.append(url)
            if url.endswith('.csv'): return ('series,release\n'+''.join(f's{i},2020-01-01\n' for i in range(5))).encode()
            if 'almalinux' in url:return b'unused'
            return json.dumps([{'repo':'fedora_45','version':'1.0'}]).encode()
        result=collect(config,fetcher=fetch,sleep=waits.append,now='2026-01-01T00:00:00Z')
        self.assertEqual(len(result['projects']),2)
        self.assertEqual(waits,[1.1])
        self.assertTrue(result['repositories'][0]['observed_in_capture'])
        def fail(url):raise OSError('source unavailable')
        with self.assertRaises(OSError):collect(config,fetcher=fail)
