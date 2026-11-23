# -*- coding: utf-8 -*-

import unittest
from unittest.mock import patch

from ..services.module_status import mgr_module_state, unavailable


MGR_MAP = {
    'available_modules': [{'name': 'iscsi'}, {'name': 'nvmeof'}, {'name': 'rbd'}],
    'modules': ['rbd'],
    'always_on_modules': {'tentacle': ['rbd']},
}


class TestMgrModuleState(unittest.TestCase):

    @patch('dashboard.services.module_status.mgr')
    def test_disabled_when_listed_but_not_enabled(self, mgr):
        mgr.get.return_value = MGR_MAP
        mgr.release_name = 'tentacle'
        self.assertEqual(mgr_module_state('iscsi'), 'disabled')

    @patch('dashboard.services.module_status.mgr')
    def test_enabled_when_active_or_always_on(self, mgr):
        mgr.get.return_value = MGR_MAP
        mgr.release_name = 'tentacle'
        self.assertEqual(mgr_module_state('rbd'), 'enabled')
        self.assertEqual(mgr_module_state('nvmeof'), 'disabled')

    @patch('dashboard.services.module_status.mgr')
    def test_unknown_when_the_module_is_not_shipped(self, mgr):
        mgr.get.return_value = MGR_MAP
        mgr.release_name = 'tentacle'
        self.assertEqual(mgr_module_state('not-a-module'), 'unknown')

    @patch('dashboard.services.module_status.mgr')
    def test_unknown_when_the_map_cannot_be_read(self, mgr):
        mgr.get.side_effect = RuntimeError('no map')
        self.assertEqual(mgr_module_state('iscsi'), 'unknown')

    def test_unavailable_payload(self):
        self.assertEqual(unavailable('off', 'module_disabled', 'iscsi'), {
            'available': False,
            'message': 'off',
            'reason': 'module_disabled',
            'module': 'iscsi',
        })
