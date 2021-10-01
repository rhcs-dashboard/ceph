#!/usr/bin/env bash

export PATH=/root/bin:$PATH
mkdir /root/bin

cp /mnt/{{ ceph_dev_folder }}/src/cephadm/cephadm /root/bin/cephadm
chmod +x /root/bin/cephadm
mkdir -p /etc/ceph
mon_ip=$(ifconfig eth0  | grep 'inet ' | awk '{ print $2}')

cephadm bootstrap --mon-ip $mon_ip --initial-dashboard-password {{ admin_password }} --allow-fqdn-hostname --skip-monitoring-stack --dashboard-password-noupdate --shared_ceph_folder /mnt/{{ ceph_dev_folder }}

fsid=$(cat /etc/ceph/ceph.conf | grep fsid | awk '{ print $3}')
ceph_cmd="cephadm shell --fsid ${fsid} -c /etc/ceph/ceph.conf -k /etc/ceph/ceph.client.admin.keyring"

{% for number in range(1, nodes) %}
  ssh-copy-id -f -i /etc/ceph/ceph.pub  -o StrictHostKeyChecking=no root@{{ prefix }}-node-0{{ number }}.{{ domain }}
  {% if expanded_cluster is defined %}
    ${ceph_cmd} ceph orch host add {{ prefix }}-node-0{{ number }}.{{ domain }}
  {% endif %}
{% endfor %}

{% if expanded_cluster is defined %}
  ${ceph_cmd} ceph orch apply osd --all-available-devices
  sleep 30 # waiting for OSDs to get in/up

  # create filesystem
  ${ceph_cmd} ceph fs volume create myfs
{% endif %}
