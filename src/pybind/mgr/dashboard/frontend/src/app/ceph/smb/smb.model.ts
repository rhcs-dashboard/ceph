import { CephServicePlacement } from '~/app/shared/models/service.interface';

export interface SMBCluster {
  resource_type: typeof CLUSTER_RESOURCE;
  cluster_id: string;
  auth_mode: typeof AUTHMODE;
  domain_settings?: DomainSettings;
  user_group_settings?: JoinSource[];
  custom_dns?: string[];
  placement?: CephServicePlacement;
  clustering?: typeof CLUSTERING;
  public_addrs?: PublicAddress;
}

export interface RequestModel {
  cluster_resource: SMBCluster;
}

export interface DomainSettings {
  realm?: string;
  join_sources?: JoinSource[];
}

export interface JoinSource {
  source_type: string;
  ref: string;
}

export interface PublicAddress {
  address: string;
  destination: string;
}

export const CLUSTERING = {
  Default: 'default',
  Always: 'always',
  Never: 'never'
};

export const RESOURCE = {
  ClusterResource: 'cluster_resource',
  Resource: 'resource'
};

export const AUTHMODE = {
  User: 'user',
  activeDirectory: 'active-directory'
};

export const PLACEMENT = {
  host: 'hosts',
  label: 'label'
};

export interface SMBJoinAuth {
  resource_type: string;
  auth_id: string;
  auth: Auth;
  linked_to_cluster?: string;
}

export interface SMBUsersGroups {
  resource_type: string;
  users_groups_id: string;
  values: Value;
  linked_to_cluster?: string;
}

interface Auth {
  username: string;
  password: string;
}

export interface User {
  name: string;
  password: string;
}

export interface Group {
  name: string;
}

interface Value {
  users: User[];
  groups: Group[];
}

export const CLUSTER_RESOURCE = 'ceph.smb.cluster';
export const JOIN_AUTH_RESOURCE = 'ceph.smb.join.auth';
export const USERSGROUPS_RESOURCE = 'ceph.smb.usersgroups';
