export const enum Promqls {
  USEDCAPACITY = 'sum(ceph_osd_stat_bytes_used)/sum(ceph_osd_stat_bytes)',
  IPS = 'sum(irate(ceph_osd_op_w_in_bytes[1m]))',
  OPS = 'sum(irate(ceph_osd_op_r_out_bytes[1m]))',
  READ_LATENCY = 'avg(ceph_osd_apply_latency_ms)',
  WRITE_LATENCY = 'avg(ceph_osd_commit_latency_ms)',
  READCLIENTTHROUGHPUT = 'sum(irate(ceph_pool_rd_bytes[1m]))',
  WRITECLIENTTHROUGHPUT = 'sum(irate(ceph_pool_wr_bytes[1m]))', // TODO : use appropriate promql
  RECOVERYTHOROUGHPUT = 'sum(irate(ceph_osd_recovery_bytes[1m]))' // TODO : use appropriate promql
}
