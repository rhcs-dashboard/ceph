
# -*- coding: utf-8 -*-

import logging

from typing import List, Optional
import enum


# TODO use import from mgr.smb.enums import AuthMode, SMBClustering
from dashboard.controllers._permissions import CreatePermission, DeletePermission
from smb import results

from .. import mgr
from ..security import Scope
from . import APIDoc, APIRouter, ReadPermission, RESTController

logger = logging.getLogger('controllers.smb')


class AuthMode(enum.Enum):
    USER = 'user'
    ACTIVE_DIRECTORY = 'active-directory'

class SMBClustering(enum.Enum):
    DEFAULT = 'default'
    ALWAYS = 'always'
    NEVER = 'never'

@APIRouter('/smb/cluster', Scope.SMB)
@APIDoc("SMB Cluster Management API", "SMB")
class SMBCluster(RESTController):

    @ReadPermission
    def list(self):
        return mgr.remote('smb', 'cluster_ls')

    @CreatePermission
    def create(
        self,
        cluster_id: str,
        auth_mode: AuthMode,
        domain_realm: str = '',
        domain_join_ref: Optional[List[str]] = None,
        domain_join_user_pass: Optional[List[str]] = None,
        user_group_ref: Optional[List[str]] = None,
        define_user_pass: Optional[List[str]] = None,
        custom_dns: Optional[List[str]] = None,
        placement: Optional[str] = None,
        clustering: Optional[SMBClustering] = None,
        public_addrs: Optional[List[str]] = None
    ) -> results.Result:
        return mgr.remote('smb', 'cluster_create', cluster_id, auth_mode, domain_realm,
                        domain_join_ref, domain_join_user_pass, user_group_ref,
                        define_user_pass, custom_dns, placement, clustering, public_addrs)

@APIRouter('/smb/share', Scope.SMB)
@APIDoc("SMB Share Management API", "SMB")
class SMBShare(RESTController):

    @ReadPermission
    def list(self, cluster_id: str):
        return mgr.remote('smb', 'share_ls', cluster_id)

    @DeletePermission
    def delete(self, cluster_id: str, share_id: str) -> results.Result:
        return mgr.remote('smb', 'share_rm', cluster_id, share_id)

