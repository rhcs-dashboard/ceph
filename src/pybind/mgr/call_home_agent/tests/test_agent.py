import unittest
import time
import json
import os
from collections import defaultdict

from unittest.mock import MagicMock, Mock, patch

#from call_home_agent.module import Report
from call_home_agent.module import CallHomeAgent
from call_home_agent.ReportLastContact import ReportLastContact, EventLastContact
from call_home_agent.ReportInventory import ReportInventory, EventInventory
from call_home_agent.ReportStatusAlerts import ReportStatusAlerts
from call_home_agent.ReportStatusHealth import ReportStatusHealth
from call_home_agent.WorkFlowUploadSnap import WorkFlowUploadSnap
from call_home_agent.Report import Report, ReportTimes
import mgr_module
import traceback

TEST_JWT_TOKEN = r"eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJ0ZXN0IiwiaWF0IjoxNjkxNzUzNDM5LCJqdGkiOiIwMTIzNDU2Nzg5MDEyMzQ1Njc4OTAwMTIzNDU2Nzg5MCJ9.0F66k81_PmKoSd9erQoxnq73760SXs8WQTd3s8pqEFY\\"
EXPECTED_JTI = '01234567890123456789001234567890'

JWT_REG_CREDS_DICT = {"url": "test.icr.io", "username": "test_username", "password": TEST_JWT_TOKEN}
JWT_REG_CREDS =json.dumps(JWT_REG_CREDS_DICT)
PLAIN_PASSWORD_REG_CREDS_DICT = {"url": "test.icr.io", "username": "test_username", "password": "plain_password"}


class MockedMgr():
    class Log:
        def error(self, msg):
            print(msg)

        def warning(self, msg):
            print(msg)

        def info(self, msg):
            print(msg)

        def debug(self, msg):
            #print(msg)
            pass

        def exception(self, msg):
            print(msg)

    class HealthChecks:
        def pop(self, what, something):
            pass

    def __init__(self, *args, **kwargs):
        self.version = '99.9'
        self.log = self.Log()
        self.health_checks = self.HealthChecks()

    def get(self, what):
        simple_commands = ["osd_map_crush", "devices", "df", "fs_map", "mgr_map", "osd_map_tree", "osd_metadata", "osd_map", "pg_summary", "service_map"]
        if what == 'mon_map':
            return {'fsid': 'mocked_fsid'}
        elif what == 'health':
            return {'json': json.dumps({'health': 'mocked health text'})}
        elif what in simple_commands:
            return {what: f"mocked {what}"}
        else:
            raise Exception(f"Unknown get what [{what}], please mock it")

    def list_servers(self):
        return ['mock_serverA', 'mock_serverB']

    def mon_command(self, command):
        return 0, json.dumps({'health': {'status': 'mocked health status  mon_cmd'}}), ""

    def remote(self, component, command, service_name=None, hostname=None, sos_params=None):
        m = MagicMock()
        m.exception_str = ''
        if command in ['list_daemons', 'get_hosts']:
            #attrs = {'hostname': 'daemon_hostname'}
            m.result = [Mock(hostname='daemon_hostname', labels=['_admin','meow'], ip='4.3.2.1', ports=[42])]
            return m
        elif command == 'sos':
            m.result = ['sosreport_case_part1 sosreport_case_part2 sosreport_case_part3']
            return m
        else:
            m.result = 'mocked hw status'
            return m

    def get_module_option(self, opt_name, default=None):
        for opt in self.MODULE_OPTIONS:
            if opt['name'] == opt_name:
                return opt['default']
        raise Exception(f"EEEEEEEEEEEEEEEEEEEEEEEEEE Can't find Option name {opt_name}")

    def get_store(self, opt_name, default=None):
        # if default is None:
        #     raise Exception(f"EEEEEEEEEEEEEEEEEEEEEEEEEE Mocked get_store requires default")
        return default

    def set_store(self, opt_name, val):
        pass

    def set_health_checks(self, val):
        pass

    def shutdown(self):
        pass

def mocked_ceph_command(self, srv_type, prefix, key=None, mgr=None, detail=None):
    if prefix == 'config-key get':
        if key == 'mgr/cephadm/registry_credentials':
            return JWT_REG_CREDS
        else:
            raise Exception(f"Unknown ceph command [{prefix}], key=[{key}], please mock it")
    elif prefix in ['status', 'health', 'osd tree', 'report', 'osd dump', 'df']:
        return f"mocked_ceph_command {prefix}"
    else:
        raise Exception(f"Unknown ceph command [{prefix}], please mock it")

def mocked_requests_get(url, auth=None, data=None, headers=None, proxies=None, params=None):
    """
    Used by ReportStatusAlerts to query prometheous
    """
    m = Mock()
    if "api/v1/query" in url:
        # This is a request for Prometheous
        m.json.return_value = {'data': {'result': [{'value': "1234"}] }}
    elif "api/v1/targets" in url:
        m.json.return_value = {'data': {'activeTargets': [{'health': "up"}] }}
    else:
        m.json.return_value = {'data': {'alerts': [] }}
    return m


original_time_time = time.time
test_object = None
debug = False
verbose = False

def mock_glob(pattern: str):
    print(f"mock_glob: globbing {pattern}")
    current_dir = os.path.dirname(os.path.abspath(__file__))
    return [f"{current_dir}/testfile1", f"{current_dir}/testfile2", f"{current_dir}/testfile3"]

#@patch('mgr_module.MgrModule.version', '99.9')
class TestAgent(unittest.TestCase):

    ########################### Time handling ############################
    def mocked_time_time(self):
        if self.test_end and self.mocked_now > self.test_end:
            self.agent.shutdown()

        debug and print(f"#### mocked_now is {self.mocked_now}")
        return self.mocked_now

    def mocked_sleep(self, seconds):
        debug and print(f"#### mocked_sleep for {seconds} seconds")
        self.mocked_now += seconds
        #print("".join(traceback.format_stack()))

    ########################### HTTP requests ############################
    def mocked_requests_post(self, url, auth=None, data=None, headers=None, proxies=None, timeout=None):
        print("vvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv request.post vvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv")
        print(f"  URL: {url}")
        print(f"  now: {test_object.mocked_now if test_object.mocked_now is not None else 'None'}")
        event_type = None
        if data:
            try:
                pretty = json.dumps(json.loads(data), indent=4)
                try:
                    event_type = json.loads(data)['events'][0]['header']['event_type']
                    if event_type == 'confirm_response':
                        component = 'NA'
                    else:
                        component = json.loads(data)['events'][0]['body']['component']
                    print(f"  event_type={event_type}  component={component}")
                    self.sent_events[f"{event_type}-{component}"] += 1  # so we can assertEqual on it later
                except:
                    print('Data does not contain an event type')
                verbose and print(f"Data: {pretty}")
            except:
                print(f"Data: {data}")
        print("^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^")

        m = Mock()
        m.raise_for_status.return_value = None
        m.text = json.dumps(self.requests_post_response)
        m.json.return_value = json.loads(m.text)
        if 'upload_tid' in url:  # ecurep
            m.json.return_value = {'id': 'upload_tid123'}
            return m
        elif 'upload_sf' in url:  # ecurep
            return m
        elif 'esupport' in url:  # call home
            if event_type == 'last_contact':
                if self.mock_requests_send_has_ur:
                    self.mock_requests_send_has_ur -= 1
                    print("mocked_requests_post(): Returning yes UR")
                    m.text = self.mocked_last_contact_response_yes_ur
                    if self.mock_requests_cooldown_pmr:
                        # replace the pmr so that it will be different UR for stale, but same for cooldown
                        new_pmr = self.mock_requests_cooldown_pmr.pop()
                        m.text = self.mocked_last_contact_response_yes_ur.replace('TS1234567', new_pmr)
                        print(f"####### replacing PMR to {new_pmr}")
                else:
                    m.text = self.mocked_last_contact_response_no_ur
                m.json.return_value = json.loads(m.text)
            return m
        else:
            raise Exception(f"Unknown mocked_requests_post URL [{url}], please mock it")
    ######################################################################

    def mock_mgr(self):

        CallHomeAgent.__bases__ = (MockedMgr,)
        #patch('mgr_module.MgrModule.version', '99.9').start()
        patch('call_home_agent.module.CallHomeAgent.ceph_command', mocked_ceph_command).start()
        patch('call_home_agent.WorkFlowUploadSnap.DIAGS_FOLDER', '/tmp').start()
        patch('call_home_agent.module.CallHomeAgent.get_secrets',
              return_value={'api_key': 'mocked_api_key',
                            'private_key': 'mocked_private_key',
                            'ecurep_transfer_id': 'mocked_ecurep_transfer_id',
                            'ecurep_password': 'mocked_ecurep_password'}
              ).start()


        patch('requests.post', self.mocked_requests_post).start()
        patch('requests.get', mocked_requests_get).start()
        patch('glob.glob', mock_glob).start()
        patch('os.remove', Mock()).start()
        patch('os.path.getsize', Mock(return_value=42)).start()

    def setUp(self):
        self.mock_mgr()
        global test_object
        test_object = self

        ####### time handling #######
        #self.mocked_now = original_time_time()
        self.mocked_now = 0
        self.test_end = None

        ####### HTTP requests handling #######
        self.mocked_last_contact_response_no_ur = None
        self.mocked_last_contact_response_yes_ur = None
        self.mock_requests_send_has_ur = 0
        self.mock_requests_cooldown_pmr = []
        self.sent_events = defaultdict(int)

        # Load the json answers that requests.post() should return
        with open(os.path.dirname(__file__) + '/response_no_pending_ur.json', 'r') as resp:
            self.mocked_last_contact_response_no_ur = resp.read()

        with open(os.path.dirname(__file__) + '/response_yes_pending_ur.json', 'r') as resp:
            self.mocked_last_contact_response_yes_ur = resp.read()

        self.requests_post_response = {'some': 'answer'}

    def test_reports(self):
        agent = CallHomeAgent()
        self.agent = agent
        ReportInventory(agent).run()
        ReportLastContact(agent).run()
        # ReportStatusAlerts: We dont fully mock the returned json to get_prometheus_alerts(), therefore
        #   it raises an exception, catches it, and generates a "Can't read from prometheus" health alert.
        ReportStatusAlerts(agent).run()
        ReportStatusHealth(agent).run()

    def test_last_contact_no_ur(self):
        agent = CallHomeAgent()
        self.agent = agent
        ReportLastContact(agent).run()
        self.assertEqual(len(agent.ur_queue), 0)
        self.assertEqual(self.sent_events['status-ceph_log_upload'], 0)
        self.assertEqual(self.sent_events['confirm_response-NA'], 0)

    def test_last_contact_yes_ur(self):
        agent = CallHomeAgent()
        self.agent = agent
        self.mock_requests_send_has_ur = True
        ReportLastContact(agent).run()
        self.assertEqual(self.sent_events['status-ceph_log_upload'], 4)
        self.assertEqual(self.sent_events['confirm_response-NA'], 1)
        self.assertEqual(len(agent.ur_queue), 0)
        self.assertEqual(len(agent.ur_stale), 1)
        self.assertEqual(len(agent.ur_cooldown), 1)

    def test_serve_and_stale(self):
        with patch('time.time', side_effect=self.mocked_time_time), patch('time.sleep', side_effect=self.mocked_sleep), patch('threading.Event.wait', side_effect=self.mocked_sleep):
            agent = CallHomeAgent()

            self.test_end = self.mocked_time_time() + 86000  # a bit less than a day
            self.mock_requests_send_has_ur = 2
            self.agent = agent
            # This test checks the UR stale mechanism by running the agent for enough time for a stale message to be old enough to be deleted
            # from the stale memory. By default, stale_timeout is 10 days but running this test, emulating 10 days takes too much time
            # so we change the stale_timeout to 1 day so it will be quicker.
            agent.stale_timeout = 86400
            agent.serve()

            self.assertEqual(len(agent.ur_queue), 0)
            self.assertEqual(len(agent.ur_stale), 1) # 1 if less than 24 hours. 0 if more
            self.assertEqual(len(agent.ur_cooldown), 0)
            self.assertEqual(self.sent_events['confirm_response-NA'], 1)

            self.mocked_sleep(1000) # now we're past 24 hours since start

            self.test_end = self.mocked_time_time() + 43200  # half a day
            self.mock_requests_send_has_ur = 2
            agent.run = True
            agent.serve()

            self.assertEqual(self.sent_events['confirm_response-NA'], 2)
            #self.assertEqual(1, 0)

    def test_serve_and_cooldown(self):
        with patch('time.time', side_effect=self.mocked_time_time), patch('time.sleep', side_effect=self.mocked_sleep), patch('threading.Event.wait', side_effect=self.mocked_sleep):
            agent = CallHomeAgent()

            self.test_end = self.mocked_time_time() + 86000  # a bit less than a day
            self.mock_requests_send_has_ur = 2
            self.mock_requests_cooldown_pmr = ['TS1234567', 'TS1234568']
            self.agent = agent
            agent.serve()

            self.assertEqual(len(agent.ur_queue), 0)
            self.assertEqual(len(agent.ur_stale), 2) # as we got 2 different PMRs, we have 2 for stale.
            self.assertEqual(len(agent.ur_cooldown), 0)
            self.assertEqual(self.sent_events['confirm_response-NA'], 2)

    def test_report_multiple_events(self):
        class ReportMultiple(Report):
            def __init__(self, agent, event_classes) -> None:
                super().__init__(agent, 'test_multiple', event_classes)

        agent = CallHomeAgent()
        self.agent = agent
        ReportMultiple(agent, [EventInventory, EventLastContact]).run()
        #self.assertEqual(1, 0)

    def test_cli_print_report_cmd(self):
        agent = CallHomeAgent()
        ret = agent.cli_show('status')
        
        print("XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX")
        print(ret.stdout)
        print("XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX")
        self.assertFalse('private_key' in ret.stdout)
        self.assertFalse('api_key' in ret.stdout)
        self.assertTrue('target_space' in ret.stdout)

    def test_cli_send_report_cmd(self):
        agent = CallHomeAgent()
        ret = agent.cli_send('status')
        
        print("XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX")
        print(ret.stdout)
        print("XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX")
        self.assertEqual(ret.stdout, 'status report sent successfully:\n{\n    "some": "answer"\n}')

    def test_cli_upload_diagnostics(self):
        agent = CallHomeAgent()
        ret = agent.cli_upload_diagnostics('ticket123', 1)
        
        print("XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX")
        print(ret.stdout)
        print("XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX")
        self.assertEqual(ret.stdout, 'Success')

    def test_cli_list_queues(self):
        agent = CallHomeAgent()
        self.mock_requests_send_has_ur = 2
        self.mock_requests_cooldown_pmr = ['TS1234567', 'TS1234568']
        ReportLastContact(agent).run()
        ReportLastContact(agent).run()
        ret = agent.cli_list_queues()
        
        print("XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX")
        print(ret.stdout)
        print("XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX")
        self.assertTrue('upload_snap-3-TS1234568-' in ret.stdout)

    def test_connectivity_status(self):
        agent = CallHomeAgent()
        status = agent.get_call_home_status()
        self.assertEqual(status['connectivity'], False)

        # Send message, expect an error because it's not returning the correct json fields
        agent.test_connectivity()
        status = agent.get_call_home_status()
        self.assertEqual(status['connectivity'], False)
        self.assertEqual(status['connectivity_error'], 'Bad response from Call Home: {\n    "some": "answer"\n}')

        self.requests_post_response = {"service": "ibm_callhome_connect", "more": "info"}
        agent.test_connectivity()
        status = agent.get_call_home_status()
        self.assertEqual(status['connectivity'], True)
        self.assertEqual(status['connectivity_error'], 'Success')
