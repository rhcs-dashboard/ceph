# -*- coding: utf-8 -*-

import unittest
from unittest.mock import Mock, patch

from ..controllers.hardware import Hardware, HardwareGrafana
from ..tests import ControllerTestCase


class HardwareTest(ControllerTestCase):
    @classmethod
    def setup_server(cls):
        cls.setup_controllers([Hardware, HardwareGrafana], "/test")

    @patch('dashboard.controllers.hardware.HardwareService')
    def test_devices_endpoint(self, mock_service):
        """Test /api/hardware/devices endpoint"""
        mock_service.get_devices.return_value = {
            'storage': [
                {
                    'hostname': 'host1',
                    'component_id': 'nvme0',
                    'model': 'Test Drive',
                    'capacity_bytes': 1000000000,
                    'health': 'OK',
                    'state': 'Enabled'
                }
            ]
        }

        self._get('/test/hardware/devices?categories=storage')
        self.assertStatus(200)
        result = self.json_body()
        self.assertIn('storage', result)
        self.assertEqual(len(result['storage']), 1)
        self.assertEqual(result['storage'][0]['model'], 'Test Drive')

    @patch('dashboard.controllers.hardware.HardwareService')
    def test_devices_with_hostname_filter(self, mock_service):
        """Test /api/hardware/devices with hostname parameter"""
        mock_service.get_devices.return_value = {'storage': []}

        self._get('/test/hardware/devices?hostname=host1')
        self.assertStatus(200)
        mock_service.get_devices.assert_called_once_with(None, 'host1')

    def test_grafana_health_endpoint(self):
        """Test /api/hardware/grafana/health endpoint"""
        self._get('/test/hardware/grafana/health')
        self.assertStatus(200)
        self.assertJsonBody({'status': 'OK'})

    def test_grafana_search_endpoint(self):
        """Test /api/hardware/grafana/search endpoint"""
        self._post('/test/hardware/grafana/search', {})
        self.assertStatus(200)
        result = self.json_body()
        self.assertIsInstance(result, list)
        self.assertIn('storage_devices', result)
        self.assertIn('firmwares', result)
        self.assertIn('summary', result)

    @patch('dashboard.controllers.hardware.HardwareService')
    def test_grafana_query_storage(self, mock_service):
        """Test /api/hardware/grafana/query for storage_devices target"""
        mock_service.get_devices.return_value = {
            'storage': [
                {
                    'hostname': 'host1',
                    'component_id': 'nvme0',
                    'model': 'Samsung 970',
                    'capacity_bytes': 512000000000,
                    'protocol': 'NVMe',
                    'serial_number': 'ABC123',
                    'health': 'OK',
                    'state': 'Enabled'
                }
            ]
        }

        payload = {
            'targets': [
                {'target': 'storage_devices', 'refId': 'A', 'type': 'table'}
            ],
            'range': {'from': 'now-1h', 'to': 'now'}
        }

        self._post('/test/hardware/grafana/query', payload)
        self.assertStatus(200)
        result = self.json_body()
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]['target'], 'storage_devices')
        self.assertEqual(result[0]['type'], 'table')
        self.assertIn('columns', result[0])
        self.assertIn('rows', result[0])
        self.assertEqual(len(result[0]['rows']), 1)

    @patch('dashboard.controllers.hardware.HardwareService')
    def test_grafana_query_firmwares(self, mock_service):
        """Test /api/hardware/grafana/query for firmwares target"""
        mock_service.get_devices.return_value = {
            'firmwares': [
                {
                    'hostname': 'host1',
                    'firmware_type': 'bmc',
                    'version': '1.2.3',
                    'updateable': True
                }
            ]
        }

        payload = {
            'targets': [
                {'target': 'firmwares', 'refId': 'B', 'type': 'table'}
            ],
            'range': {'from': 'now-1h', 'to': 'now'}
        }

        self._post('/test/hardware/grafana/query', payload)
        self.assertStatus(200)
        result = self.json_body()
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]['target'], 'firmwares')
        self.assertEqual(len(result[0]['rows']), 1)
        self.assertEqual(result[0]['rows'][0][1], 'bmc')  # firmware_type column

    @patch('dashboard.controllers.hardware.HardwareService')
    def test_grafana_query_multiple_targets(self, mock_service):
        """Test /api/hardware/grafana/query with multiple targets"""
        mock_service.get_devices.return_value = {
            'storage': [],
            'processors': []
        }

        payload = {
            'targets': [
                {'target': 'storage_devices', 'refId': 'A', 'type': 'table'},
                {'target': 'processors', 'refId': 'B', 'type': 'table'}
            ],
            'range': {'from': 'now-1h', 'to': 'now'}
        }

        self._post('/test/hardware/grafana/query', payload)
        self.assertStatus(200)
        result = self.json_body()
        self.assertEqual(len(result), 2)


class HardwareServiceTest(unittest.TestCase):
    @patch('dashboard.services.hardware.OrchClient')
    def test_get_devices_flatten_storage(self, mock_orch):
        """Test get_devices() flattens storage data correctly"""
        from ..services.hardware import HardwareService

        mock_hardware = Mock()
        mock_hardware.common.return_value = {
            'host1': {
                'Self': {
                    'nvme0': {
                        'model': 'Samsung',
                        'capacity_bytes': 512000000000,
                        'status': {'health': 'OK', 'state': 'Enabled'}
                    }
                }
            }
        }
        mock_orch.instance.return_value.hardware = mock_hardware

        result = HardwareService.get_devices(['storage'])

        self.assertIn('storage', result)
        self.assertEqual(len(result['storage']), 1)
        device = result['storage'][0]
        self.assertEqual(device['hostname'], 'host1')
        self.assertEqual(device['system_id'], 'Self')
        self.assertEqual(device['component_id'], 'nvme0')
        self.assertEqual(device['model'], 'Samsung')
        self.assertEqual(device['health'], 'OK')
        self.assertEqual(device['state'], 'Enabled')

    @patch('dashboard.services.hardware.OrchClient')
    def test_get_devices_firmwares_special_structure(self, mock_orch):
        """Test get_devices() handles firmwares special structure (no sys_id level)"""
        from ..services.hardware import HardwareService

        mock_hardware = Mock()
        mock_hardware.common.return_value = {
            'host1': {
                'bmc': {
                    'name': 'BMC',
                    'version': '1.2.3',
                    'updateable': True,
                    'status': 'unknown'
                }
            }
        }
        mock_orch.instance.return_value.hardware = mock_hardware

        result = HardwareService.get_devices(['firmwares'])

        self.assertIn('firmwares', result)
        self.assertEqual(len(result['firmwares']), 1)
        fw = result['firmwares'][0]
        self.assertEqual(fw['hostname'], 'host1')
        self.assertEqual(fw['firmware_type'], 'bmc')
        self.assertEqual(fw['version'], '1.2.3')
        self.assertEqual(fw['updateable'], True)

    @patch('dashboard.services.hardware.OrchClient')
    def test_get_devices_default_categories(self, mock_orch):
        """Test get_devices() uses default categories when none specified"""
        from ..services.hardware import HardwareService

        mock_hardware = Mock()
        mock_hardware.common.return_value = {}
        mock_orch.instance.return_value.hardware = mock_hardware

        result = HardwareService.get_devices()

        # Should call common() for default categories
        calls = mock_hardware.common.call_args_list
        categories_called = [call[1]['category'] for call in calls]
        expected = ['storage', 'processors', 'memory', 'network', 'power', 'fans']
        self.assertEqual(sorted(categories_called), sorted(expected))
