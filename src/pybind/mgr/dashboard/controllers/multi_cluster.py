from . import APIDoc, APIRouter, CreatePermission, UpdatePermission, ReadPermission, Endpoint, EndpointDoc, RESTController
import requests
from ..exceptions import DashboardException

from ..settings import Settings
from ..security import Scope

from ..tools import configure_cors 

import logging

import json
logger = logging.getLogger('routes')


@APIRouter('/multicluster', Scope.CONFIG_OPT)
@APIDoc('Multi Cluster Route Management API', 'Multi Cluster Route')
class MultiClusterRoute(RESTController):
    def _proxy(self, method, base_url, path, params=None, payload=None, verify=False, exit=False, headers=None,
               origin=None):
        try:
            if not headers:
                headers = {
                    'Accept': 'application/vnd.ceph.api.v1.0+json',
                    'Content-Type': 'application/json',
                }
            response = requests.request(method, base_url + path, params=params,
                                        json=payload, verify=verify, headers=headers)
        except Exception as e:
            raise DashboardException(
                "Could not reach {}".format(base_url+path),
                http_status_code=404,
                component='dashboard')
        try:
            content = json.loads(response.content, strict=False)
        except json.JSONDecodeError as e:
            raise DashboardException(
                "Error parsing Dashboard API response: {}".format(e.msg),
                component='dashboard')
        try:
            headers = {
                'Accept': 'application/vnd.ceph.api.v1.0+json',
                'Authorization': 'Bearer ' + content['token'],
            }
            requests.request('PUT', base_url + 'api/multicluster/update_cors', json={'url': origin}, verify=verify, headers=headers)
            response = requests.request('GET', base_url + 'api/health/get_cluster_fsid',
                                        headers=headers, verify=verify)
                            
        except Exception as e:
            raise DashboardException(
                "Could not reach {}".format(base_url+path),
                http_status_code=404,
                component='dashboard')

        try:
            fsid = json.loads(response.content, strict=False)
        except json.JSONDecodeError as e:
            raise DashboardException(
                "Error parsing Dashboard API response: {}".format(e.msg),
                component='dashboard')

        return {
            "token": content['token'],
            "fsid": fsid
        }

    @Endpoint('POST')
    @ReadPermission
    @EndpointDoc("Which route you want to go")
    def auth(self, url: str, helper_text: str, name: str, username = '', password = '', token = None, origin=None):
        if isinstance(Settings.MULTICLUSTER_CONFIG, str):
            item_to_dict = json.loads(Settings.MULTICLUSTER_CONFIG)
            copy_config = item_to_dict.copy()
        else:
            copy_config = Settings.MULTICLUSTER_CONFIG.copy()
        if token:
            try:
                copy_config['config'].append({'name': name, 'url': url, 'token': token, 'helper_text': helper_text})
            except KeyError:
                copy_config = {'current_url': url, 'config': [{'name': name, 'url': url, 'token': token, 'helper_text': helper_text}]}
            Settings.MULTICLUSTER_CONFIG = copy_config
            return
        params = { "username": username, "password": password }
        response = self._proxy('POST', url, path='api/auth', payload=json.dumps(params), origin=origin)
        try:
            copy_config['config'].append({'name': response['fsid'], 'url': url, 'token': response['token'], 'helper_text': helper_text})
        except KeyError:
            copy_config = {'current_url': url, 'config': [{'name': response['fsid'], 'url': url, 'token': response['token'], 'helper_text': helper_text}]}
        Settings.MULTICLUSTER_CONFIG = copy_config

    @Endpoint('PUT')
    @UpdatePermission
    def set_config(self, config: str):
        if isinstance(Settings.MULTICLUSTER_CONFIG, str):
            item_to_dict = json.loads(Settings.MULTICLUSTER_CONFIG)
            copy_config = item_to_dict.copy()
        else:
            copy_config = Settings.MULTICLUSTER_CONFIG.copy()
        copy_config.update({'current_url': config})
        Settings.MULTICLUSTER_CONFIG = copy_config
        return Settings.MULTICLUSTER_CONFIG

    @Endpoint()
    @ReadPermission
    def get_config(self):
        return Settings.MULTICLUSTER_CONFIG

    @Endpoint('PUT')
    @CreatePermission
    def add_clusters(self, config: str):   
        Settings.MULTICLUSTER_CONFIG = config
    
    @Endpoint('PUT')
    @UpdatePermission
    def update_cors(self, url: str):
        configure_cors(url)
