export const enum Promqls {
  USEDCAPACITY = 'sum(ceph_osd_stat_bytes_used)/sum(ceph_osd_stat_bytes)',
  IPS = 'sum(irate(ceph_osd_op_w_in_bytes[1m]))',
  OPS = 'sum(irate(ceph_osd_op_r_out_bytes[1m]))',
  LATENCY = 'avg(ceph_osd_commit_latency_ms)',
  CLIENTTHROUGHPUT = 'avg(ceph_osd_commit_latency)', // TODO : use appropriate promql
  RECOVERYTHOROUGHPUT = 'avg(ceph_osd_commit_latency)' // TODO : use appropriate promql
}
