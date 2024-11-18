from unittest.mock import Mock

from typing import List, Optional


from .. import mgr
from ..tests import ControllerTestCase

class SMBClusterTest(ControllerTestCase):
    _smb_cluster_endpoint = '/api/smb/cluster'

    _clusters = [
                    "smbCluster1",
                    "test1",
                    "test2"
                ]

    _cluster = {
                "resource": {
                    "resource_type": "ceph.smb.cluster",
                    "cluster_id": "clusterTest",
                    "auth_mode": "user",
                    "intent": "present",
                    "user_group_settings": [
                    {
                        "source_type": "resource",
                        "ref": "ct2pfhzqubl"
                    }
                    ],
                    "placement": {},
                    "public_addrs": []
                },
                "state": "created",
                "additional_results": [
                    {
                    "resource": {
                        "resource_type": "ceph.smb.usersgroups",
                        "users_groups_id": "clusterTesswketvyo",
                        "intent": "present",
                        "values": {
                        "users": [
                            {
                            "name": "user2",
                            "password": "pass"
                            }
                        ],
                        "groups": []
                        },
                        "linked_to_cluster": "clusterTest"
                    },
                    "state": "created",
                    "success": true
                    }
                ],
                "success": true
            }

    def test_list(self):
        mgr.remote = Mock(return_value=[self._clusters])

        self._get(self._smb_cluster_endpoint)
        self.assertStatus(200)
        self.assertJsonBody([self._clusters])

    def test_create(self):
        mgr.remote = Mock(return_value=[self._cluster])

        self._post(self._smb_cluster_endpoint, {'cluster_id': 'clusterTest', 'auth_mode': 'user', 'define_user_pass': 'user2%pass'})
        self.assertStatus(200)
        self.assertInJsonBody([self._cluster])

class SMBShareTest(ControllerTestCase):
    _smb_share_endpoint = '/api/smb/share'

    _shares = [
                "share1",
                "shareTest"
            ]

    def test_list_(self):
        mgr.remote = Mock(return_value=[self._shares])

        self._get(self._smb_share_endpoint)
        self.assertStatus(200)
        self.assertJsonBody([self._shares])


    def test_delete(self):
        _res = {
                "resource": {
                    "resource_type": "ceph.smb.share",
                    "cluster_id": "smbCluster1",
                    "share_id": "share1",
                    "intent": "removed"
                },
                "state": "removed",
                "success": true
            }
        mgr.remote = Mock(return_value=[_res])

        self._delete(self._smb_share_endpoint)
        self.assertStatus(200)
        self.assertJsonBody(_res)