export const enum Promqls {
    USEDCAPACITY = 'sum(ceph_osd_stat_bytes_used)/sum(ceph_osd_stat_bytes)',
    IOPS = 'sum(ceph_osd_op_rw)',
    LATENCY = 'avg(ceph_osd_commit_latency)',
    CLIENTTHROUGHPUT = 'avg(ceph_osd_commit_latency)', // TODO : use appropriate promql
    RECOVERYTHOROUGHPUT = 'avg(ceph_osd_commit_latency)' // TODO : use appropriate promql
};