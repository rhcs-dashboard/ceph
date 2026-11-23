export interface ServiceTypeOption {
  type: string;
  name: string;
}

export interface ServiceTypeGroup {
  label: string;
  types: ServiceTypeOption[];
}

export function getServiceTypeCatalog(): ServiceTypeGroup[] {
  return [
    {
      label: $localize`Block`,
      types: [
        { type: 'iscsi', name: $localize`iSCSI` },
        { type: 'nvmeof', name: $localize`NVMe/TCP` },
        { type: 'rbd-mirror', name: $localize`RBD mirror` }
      ]
    },
    {
      label: $localize`File`,
      types: [
        { type: 'cephfs-mirror', name: $localize`CephFS mirror` },
        { type: 'mds', name: $localize`MDS` },
        { type: 'nfs', name: $localize`NFS` },
        { type: 'smb', name: $localize`SMB` }
      ]
    },
    {
      label: $localize`Object`,
      types: [{ type: 'rgw', name: $localize`RGW` }]
    },
    {
      label: $localize`Observability`,
      types: [
        { type: 'alertmanager', name: $localize`Alertmanager` },
        { type: 'alloy', name: $localize`Alloy` },
        { type: 'ceph-exporter', name: $localize`Ceph exporter` },
        { type: 'elasticsearch', name: $localize`Elasticsearch` },
        { type: 'grafana', name: $localize`Grafana` },
        { type: 'jaeger-agent', name: $localize`Jaeger agent` },
        { type: 'jaeger-collector', name: $localize`Jaeger collector` },
        { type: 'jaeger-query', name: $localize`Jaeger query` },
        { type: 'jaeger-tracing', name: $localize`Jaeger tracing` },
        { type: 'loki', name: $localize`Loki` },
        { type: 'node-exporter', name: $localize`Node exporter` },
        { type: 'prometheus', name: $localize`Prometheus` },
        { type: 'pushgateway', name: $localize`Pushgateway` },
        { type: 'snmp-gateway', name: $localize`SNMP gateway` }
      ]
    },
    {
      label: $localize`Cluster`,
      types: [
        { type: 'agent', name: $localize`Agent` },
        { type: 'crash', name: $localize`Crash collector` },
        { type: 'mgr', name: $localize`Manager` },
        { type: 'mon', name: $localize`Monitor` }
      ]
    },
    {
      label: $localize`Administration`,
      types: [
        { type: 'ingress', name: $localize`Ingress` },
        { type: 'mgmt-gateway', name: $localize`Management gateway` },
        { type: 'node-proxy', name: $localize`Node proxy` },
        { type: 'oauth2-proxy', name: $localize`OAuth2 Proxy` }
      ]
    }
  ];
}

export function serviceTypeName(type: string): string {
  for (const group of getServiceTypeCatalog()) {
    const match = group.types.find((serviceType) => serviceType.type === type);
    if (match) {
      return match.name;
    }
  }
  return type;
}

export const SERVICES_PAGE_HEADER = {
  title: $localize`Services`,
  description: $localize`Services deployed by the orchestrator. Create a service or follow an existing one.`
};
