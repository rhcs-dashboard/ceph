.. _rados-troubleshooting-mon:

==========================
 Troubleshooting Monitors
==========================

.. index:: monitor, high availability

Even if a cluster experiences monitor-related problems, the cluster is not
necessarily in danger of going down. If a cluster has lost multiple monitors,
it can still remain up and running as long as there are enough surviving
monitors to form a quorum.
   
If your cluster is having monitor-related problems, we recommend that you
consult the following troubleshooting information.

Initial Troubleshooting
=======================

#. **Make sure that the monitors are running.**

    First, make sure that the monitor (*mon*) daemon processes (``ceph-mon``)
    are running. Sometimes Ceph admins either forget to start the mons or
    forget to restart the mons after an upgrade. Checking for this simple
    oversight can save hours of painstaking troubleshooting. It is also
    important to make sure that the manager daemons (``ceph-mgr``) are running.
    Remember that typical cluster configurations provide one ``ceph-mgr`` for
    each ``ceph-mon``.

    .. note:: Rook will not run more than two managers.

#. **Make sure that you can reach the monitor nodes.**

    In certain rare cases, there may be ``iptables`` rules that block access to
    monitor nodes or TCP ports. These rules might be left over from earlier
    stress testing or rule development. To check for the presence of such
    rules, SSH into the server and then try to connect to the monitor's ports
    (``tcp/3300`` and ``tcp/6789``) using ``telnet``, ``nc``, or a similar
    tool.

#. **Make sure that the ``ceph status`` command runs  and receives a reply from the cluster.**

    If the ``ceph status`` command does receive a reply from the cluster, then
    the cluster is up and running. The monitors will answer to a ``status``
    request only if there is a formed quorum. Confirm that one or more ``mgr``
    daemons are reported as running. Under ideal conditions, all ``mgr``
    daemons will be reported as running.


    If the ``ceph status`` command does not receive a reply from the cluster,
    then there are probably not enough monitors ``up`` to form a quorum.  The
    ``ceph -s`` command with no further options specified connects to an
    arbitrarily selected monitor. In certain cases, however, it might be
    helpful to connect to a specific monitor (or to several specific monitors
    in sequence) by adding the ``-m`` flag to the command: for example, ``ceph
    status -m mymon1``.

#. **None of this worked. What now?**

    If the above solutions have not resolved your problems, you might find it
    helpful to examine each individual monitor in turn. Whether or not a quorum
    has been formed, it is possible to contact each monitor individually and
    request its status by using the ``ceph tell mon.ID mon_status`` command
    (here ``ID`` is the monitor's identifier).

    Run the ``ceph tell mon.ID mon_status`` command for each monitor in the
    cluster. For more on this command's output, see :ref:`Understanding
    mon_status
    <rados_troubleshoting_troubleshooting_mon_understanding_mon_status>`.

    There is also an alternative method: SSH into each monitor node and query
    the daemon's admin socket. See :ref:`Using the Monitor's Admin
    Socket<rados_troubleshoting_troubleshooting_mon_using_admin_socket>`.

.. _rados_troubleshoting_troubleshooting_mon_using_admin_socket:

Using the monitor's admin socket
================================

A monitor's admin socket allows you to interact directly with a specific daemon
by using a Unix socket file. This file is found in the monitor's ``run``
directory. The admin socket's default directory is
``/var/run/ceph/ceph-mon.ID.asok``, but this can be overridden and the admin
socket might be elsewhere, especially if your cluster's daemons are deployed in
containers. If you cannot find it, either check your ``ceph.conf`` for an
alternative path or run the following command:
    
.. prompt:: bash $

   ceph-conf --name mon.ID --show-config-value admin_socket

The admin socket is available for use only when the monitor daemon is running.
Whenever the monitor has been properly shut down, the admin socket is removed.
However, if the monitor is not running and the admin socket persists, it is
likely that the monitor has been improperly shut down.  In any case, if the
monitor is not running, it will be impossible to use the admin socket, and the
``ceph`` command is likely to return ``Error 111: Connection Refused``.

To access the admin socket, run a ``ceph tell`` command of the following form
(specifying the daemon that you are interested in):

.. prompt:: bash $

   ceph tell mon.<id> mon_status

This command passes a ``help`` command to the specific running monitor daemon
``<id>`` via its admin socket. If you know the full path to the admin socket
file, this can be done more directly by running the following command:

.. prompt:: bash $

   ceph --admin-daemon <full_path_to_asok_file> <command>

Running ``ceph help`` shows all supported commands that are available through
the admin socket. See especially ``config get``, ``config show``, ``mon stat``,
and ``quorum_status``.

.. _rados_troubleshoting_troubleshooting_mon_understanding_mon_status:

Understanding mon_status
========================

The status of the monitor (as reported by the ``ceph tell mon.X mon_status``
command) can always be obtained via the admin socket. This command outputs a
great deal of information about the monitor (including the information found in
the output of the ``quorum_status`` command).

To understand this command's output, let us consider the following example, in
which we see the output of ``ceph tell mon.c mon_status``::

  { "name": "c",
    "rank": 2,
    "state": "peon",
    "election_epoch": 38,
    "quorum": [
          1,
          2],
    "outside_quorum": [],
    "extra_probe_peers": [],
    "sync_provider": [],
    "monmap": { "epoch": 3,
        "fsid": "5c4e9d53-e2e1-478a-8061-f543f8be4cf8",
        "modified": "2013-10-30 04:12:01.945629",
        "created": "2013-10-29 14:14:41.914786",
        "mons": [
              { "rank": 0,
                "name": "a",
                "addr": "127.0.0.1:6789\/0"},
              { "rank": 1,
                "name": "b",
                "addr": "127.0.0.1:6790\/0"},
              { "rank": 2,
                "name": "c",
                "addr": "127.0.0.1:6795\/0"}]}}

It is clear that there are three monitors in the monmap (*a*, *b*, and *c*),
the quorum is formed by only two monitors, and *c* is in the quorum as a
*peon*.

**Which monitor is out of the quorum?**

  The answer is **a** (that is, ``mon.a``).

**Why?**

  When the ``quorum`` set is examined, there are clearly two monitors in the
  set: *1* and *2*. But these are not monitor names. They are monitor ranks, as
  established in the current ``monmap``. The ``quorum`` set does not include
  the monitor that has rank 0, and according to the ``monmap`` that monitor is
  ``mon.a``.

**How are monitor ranks determined?**

  Monitor ranks are calculated (or recalculated) whenever monitors are added or
  removed. The calculation of ranks follows a simple rule: the **greater** the
  ``IP:PORT`` combination, the **lower** the rank. In this case, because
  ``127.0.0.1:6789`` is lower than the other two ``IP:PORT`` combinations,
  ``mon.a`` has the highest rank: namely, rank 0.
  

Most Common Monitor Issues
===========================

The Cluster Has Quorum but at Least One Monitor is Down
-------------------------------------------------------

When the cluster has quorum but at least one monitor is down, ``ceph health
detail`` returns a message similar to the following::

      $ ceph health detail
      [snip]
      mon.a (rank 0) addr 127.0.0.1:6789/0 is down (out of quorum)

**How do I troubleshoot a Ceph cluster that has quorum but also has at least one monitor down?**

  #. Make sure that ``mon.a`` is running.

  #. Make sure that you can connect to ``mon.a``'s node from the
     other Monitor nodes. Check the TCP ports as well. Check ``iptables`` and
     ``nf_conntrack`` on all nodes and make sure that you are not
     dropping/rejecting connections.

  If this initial troubleshooting doesn't solve your problem, then further
  investigation is necessary.

  First, check the problematic monitor's ``mon_status`` via the admin
  socket as explained in `Using the monitor's admin socket`_ and
  `Understanding mon_status`_.

  If the Monitor is out of the quorum, then its state will be one of the
  following: ``probing``, ``electing`` or ``synchronizing``. If the state of
  the Monitor is ``leader`` or ``peon``, then the Monitor believes itself to be
  in quorum but the rest of the cluster believes that it is not in quorum. It
  is possible that a Monitor that is in one of the ``probing``, ``electing``,
  or ``synchronizing`` states has entered the quorum during the process of
  troubleshooting. Check ``ceph status`` again to determine whether the Monitor
  has entered quorum during your troubleshooting. If the Monitor remains out of
  the quorum, then proceed with the investigations described in this section of
  the documentation.
  

**What does it mean when a Monitor's state is ``probing``?**

  If ``ceph health detail`` shows that a Monitor's state is
  ``probing``, then the Monitor is still looking for the other Monitors. Every
  Monitor remains in this state for some time when it is started. When a
  Monitor has connected to the other Monitors specified in the ``monmap``, it
  ceases to be in the ``probing`` state. The amount of time that a Monitor is
  in the ``probing`` state depends upon the parameters of the cluster of which
  it is a part. For example, when a Monitor is a part of a single-monitor
  cluster (never do this in production), the monitor passes through the probing
  state almost instantaneously. In a multi-monitor cluster, the Monitors stay
  in the ``probing`` state until they find enough monitors to form a quorum
  |---| this means that if two out of three Monitors in the cluster are
  ``down``, the one remaining Monitor stays in the ``probing``  state
  indefinitely until you bring one of the other monitors up.

  If quorum has been established, then the Monitor daemon should be able to
  find the other Monitors quickly, as long as they can be reached. If a Monitor
  is stuck in the ``probing`` state and you have exhausted the procedures above
  that describe the troubleshooting of communications between the Monitors,
  then it is possible that the problem Monitor is trying to reach the other
  Monitors at a wrong address. ``mon_status`` outputs the ``monmap`` that is
  known to the monitor: determine whether the other Monitors' locations as
  specified in the ``monmap`` match the locations of the Monitors in the
  network. If they do not, see `Recovering a Monitor's Broken monmap`_.
  If the locations of the Monitors as specified in the ``monmap`` match the
  locations of the Monitors in the network, then the persistent
  ``probing`` state could  be related to severe clock skews amongst the monitor
  nodes.  See `Clock Skews`_.  If the information in `Clock Skews`_ does not
  bring the Monitor out of the ``probing`` state, then prepare your system logs
  and ask the Ceph community for help. See `Preparing your logs`_ for
  information about the proper preparation of logs.


**What does it mean when a Monitor's state is ``electing``?**

  If ``ceph health detail`` shows that a Monitor's state is ``electing``, the
  monitor is in the middle of an election. Elections typically complete
  quickly, but sometimes the monitors can get stuck in what is known as an
  *election storm*. See :ref:`Monitor Elections <dev_mon_elections>` for more
  on monitor elections.
  
  The presence of election storm might indicate clock skew among the monitor
  nodes. See `Clock Skews`_ for more information. 
  
  If your clocks are properly synchronized, search the mailing lists and bug
  tracker for issues similar to your issue. The ``electing`` state is not
  likely to persist. In versions of Ceph after the release of Cuttlefish, there
  is no obvious reason other than clock skew that explains why an ``electing``
  state would persist.  
  
  It is possible to investigate the cause of a persistent ``electing`` state if
  you put the problematic Monitor into a ``down`` state while you investigate.
  This is possible only if there are enough surviving Monitors to form quorum. 

**What does it mean when a Monitor's state is ``synchronizing``?**

  If ``ceph health detail`` shows that the Monitor is ``synchronizing``, the
  monitor is catching up with the rest of the cluster so that it can join the
  quorum. The amount of time that it takes for the Monitor to synchronize with
  the rest of the quorum is a function of the size of the cluster's monitor
  store, the cluster's size, and the state of the cluster. Larger and degraded
  clusters generally keep Monitors in the ``synchronizing`` state longer than
  do smaller, new clusters.

  A Monitor that changes its state from ``synchronizing`` to ``electing`` and
  then back to ``synchronizing`` indicates a problem: the cluster state may be
  advancing (that is, generating new maps) too fast for the synchronization
  process to keep up with the pace of the creation of the new maps. This issue
  presented more frequently prior to the Cuttlefish release than it does in
  more recent releases, because the synchronization process has since been
  refactored and enhanced to avoid this dynamic. If you experience this in
  later versions, report the issue in the `Ceph bug tracker
  <https://tracker.ceph.com>`_. Prepare and provide logs to substantiate any
  bug you raise. See `Preparing your logs`_ for information about the proper
  preparation of logs.

**What does it mean when a Monitor's state is ``leader`` or ``peon``?**

  If ``ceph health detail`` shows that the Monitor is in the ``leader`` state
  or in the ``peon`` state, it is likely that clock skew is present. Follow the
  instructions in `Clock Skews`_. If you have followed those instructions and
  ``ceph health detail`` still shows that the Monitor is in the ``leader``
  state or the ``peon`` state, report the issue in the `Ceph bug tracker
  <https://tracker.ceph.com>`_. If you raise an issue, provide logs to
  substantiate it. See `Preparing your logs`_ for information about the
  proper preparation of logs.


Recovering a Monitor's Broken ``monmap``
----------------------------------------

This is how a ``monmap`` usually looks, depending on the number of
monitors::


      epoch 3
      fsid 5c4e9d53-e2e1-478a-8061-f543f8be4cf8
      last_changed 2013-10-30 04:12:01.945629
      created 2013-10-29 14:14:41.914786
      0: 127.0.0.1:6789/0 mon.a
      1: 127.0.0.1:6790/0 mon.b
      2: 127.0.0.1:6795/0 mon.c
      
This may not be what you have however. For instance, in some versions of
early Cuttlefish there was a bug that could cause your ``monmap``
to be nullified.  Completely filled with zeros. This means that not even
``monmaptool`` would be able to make sense of cold, hard, inscrutable zeros.
It's also possible to end up with a monitor with a severely outdated monmap,
notably if the node has been down for months while you fight with your vendor's
TAC.  The subject ``ceph-mon`` daemon might be unable to find the surviving
monitors (e.g., say ``mon.c`` is down; you add a new monitor ``mon.d``,
then remove ``mon.a``, then add a new monitor ``mon.e`` and remove
``mon.b``; you will end up with a totally different monmap from the one
``mon.c`` knows).

In this situation you have two possible solutions:

Scrap the monitor and redeploy

  You should only take this route if you are positive that you won't
  lose the information kept by that monitor; that you have other monitors
  and that they are running just fine so that your new monitor is able
  to synchronize from the remaining monitors. Keep in mind that destroying
  a monitor, if there are no other copies of its contents, may lead to
  loss of data.

Inject a monmap into the monitor

  These are the basic steps:

  Retrieve the ``monmap`` from the surviving monitors and inject it into the
  monitor whose ``monmap`` is corrupted or lost.

  Implement this solution by carrying out the following procedure:

  1. Is there a quorum of monitors? If so, retrieve the ``monmap`` from the
     quorum::

      $ ceph mon getmap -o /tmp/monmap

  2. If there is no quorum, then retrieve the ``monmap`` directly from another
     monitor that has been stopped (in this example, the other monitor has
     the ID ``ID-FOO``)::

      $ ceph-mon -i ID-FOO --extract-monmap /tmp/monmap

  3. Stop the monitor you are going to inject the monmap into.

  4. Inject the monmap::

      $ ceph-mon -i ID --inject-monmap /tmp/monmap

  5. Start the monitor

  .. warning:: Injecting ``monmaps`` can cause serious problems because doing
     so will overwrite the latest existing ``monmap`` stored on the monitor. Be
     careful!

Clock Skews
-----------

The Paxos consensus algorithm requires close time synchroniziation, which means
that clock skew among the monitors in the quorum can have a serious effect on
monitor operation. The resulting behavior can be puzzling. To avoid this issue,
run a clock synchronization tool on your monitor nodes: for example, use
``Chrony`` or the legacy ``ntpd`` utility. Configure each monitor nodes so that
the `iburst` option is in effect and so that each monitor has multiple peers,
including the following: 

* Each other
* Internal ``NTP`` servers
* Multiple external, public pool servers

.. note:: The ``iburst`` option sends a burst of eight packets instead of the
   usual single packet, and is used during the process of getting two peers
   into initial synchronization.

Furthermore, it is advisable to synchronize *all* nodes in your cluster against
internal and external servers, and perhaps even against your monitors. Run
``NTP`` servers on bare metal: VM-virtualized clocks are not suitable for
steady timekeeping. See `https://www.ntp.org <https://www.ntp.org>`_ for more
information about the Network Time Protocol (NTP). Your organization might
already have quality internal ``NTP`` servers available.  Sources for ``NTP``
server appliances include the following:

* Microsemi (formerly Symmetricom) `https://microsemi.com <https://www.microsemi.com/product-directory/3425-timing-synchronization>`_
* EndRun `https://endruntechnologies.com <https://endruntechnologies.com/products/ntp-time-servers>`_
* Netburner `https://www.netburner.com <https://www.netburner.com/products/network-time-server/pk70-ex-ntp-network-time-server>`_

Clock Skew Questions and Answers
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

**What's the maximum tolerated clock skew?**

  By default, monitors allow clocks to drift up to a maximum of 0.05 seconds
  (50 milliseconds).

**Can I increase the maximum tolerated clock skew?**

  Yes, but we strongly recommend against doing so. The maximum tolerated clock
  skew is configurable via the ``mon-clock-drift-allowed`` option, but it is
  almost certainly a bad idea to make changes to this option. The clock skew
  maximum is in place because clock-skewed monitors cannot be relied upon. The
  current default value has proven its worth at alerting the user before the
  monitors encounter serious problems. Changing this value might cause
  unforeseen effects on the stability of the monitors and overall cluster
  health.

**How do I know whether there is a clock skew?**

  The monitors will warn you via the cluster status ``HEALTH_WARN``. When clock
  skew is present, the ``ceph health detail`` and ``ceph status`` commands
  return an output resembling the following::

      mon.c addr 10.10.0.1:6789/0 clock skew 0.08235s > max 0.05s (latency 0.0045s)

  In this example, the monitor ``mon.c`` has been flagged as suffering from 
  clock skew.

  In Luminous and later releases, it is possible to check for a clock skew by
  running the ``ceph time-sync-status`` command. Note that the lead monitor
  typically has the numerically lowest IP address. It will always show ``0``:
  the reported offsets of other monitors are relative to the lead monitor, not
  to any external reference source.

**What should I do if there is a clock skew?**

  Synchronize your clocks. Using an NTP client might help. However, if you
  are already using an NTP client and you still encounter clock skew problems,
  determine whether the NTP server that you are using is remote to your network
  or instead hosted on your network. Hosting your own NTP servers tends to
  mitigate clock skew problems.


Client Can't Connect or Mount
-----------------------------

Check your IP tables. Some operating-system install utilities add a ``REJECT``
rule to ``iptables``. ``iptables`` rules will reject all clients other than
``ssh`` that try to connect to the host. If your monitor host's IP tables have
a ``REJECT`` rule in place, clients that are connecting from a separate node
will fail and will raise a timeout error. Any ``iptables`` rules that reject
clients trying to connect to Ceph daemons must be addressed. For example::

    REJECT all -- anywhere anywhere reject-with icmp-host-prohibited

It might also be necessary to add rules to iptables on your Ceph hosts to
ensure that clients are able to access the TCP ports associated with your Ceph
monitors (default: port 6789) and Ceph OSDs (default: 6800 through 7300). For
example::

    iptables -A INPUT -m multiport -p tcp -s {ip-address}/{netmask} --dports 6789,6800:7300 -j ACCEPT


Monitor Store Failures
======================

Symptoms of store corruption
----------------------------

Ceph monitors store the :term:`Cluster Map` in a key-value store.  If key-value
store corruption causes a monitor to fail, then the monitor log might contain
one of the following error messages::

  Corruption: error in middle of record

or::

  Corruption: 1 missing files; e.g.: /var/lib/ceph/mon/mon.foo/store.db/1234567.ldb

Recovery using healthy monitor(s)
---------------------------------

If there are surviving monitors, we can always :ref:`replace
<adding-and-removing-monitors>` the corrupted monitor with a new one. After the
new monitor boots, it will synchronize with a healthy peer. After the new
monitor is fully synchronized, it will be able to serve clients.

.. _mon-store-recovery-using-osds:

Recovery using OSDs
-------------------

Even if all monitors fail at the same time, it is possible to recover the
monitor store by using information stored in OSDs. You are encouraged to deploy
at least three (and preferably five) monitors in a Ceph cluster. In such a
deployment, complete monitor failure is unlikely. However, unplanned power loss
in a data center whose disk settings or filesystem settings are improperly
configured could cause the underlying filesystem to fail and this could kill
all of the monitors. In such a case, data in the OSDs can be used to recover
the monitors.  The following is such a script and can be used to recover the
monitors:


.. code-block:: bash

  ms=/root/mon-store
  mkdir $ms
  
  # collect the cluster map from stopped OSDs
  for host in $hosts; do
    rsync -avz $ms/. user@$host:$ms.remote
    rm -rf $ms
    ssh user@$host <<EOF
      for osd in /var/lib/ceph/osd/ceph-*; do
        ceph-objectstore-tool --data-path \$osd --no-mon-config --op update-mon-db --mon-store-path $ms.remote
      done
  EOF
    rsync -avz user@$host:$ms.remote/. $ms
  done
  
  # rebuild the monitor store from the collected map, if the cluster does not
  # use cephx authentication, we can skip the following steps to update the
  # keyring with the caps, and there is no need to pass the "--keyring" option.
  # i.e. just use "ceph-monstore-tool $ms rebuild" instead
  ceph-authtool /path/to/admin.keyring -n mon. \
    --cap mon 'allow *'
  ceph-authtool /path/to/admin.keyring -n client.admin \
    --cap mon 'allow *' --cap osd 'allow *' --cap mds 'allow *'
  # add one or more ceph-mgr's key to the keyring. in this case, an encoded key
  # for mgr.x is added, you can find the encoded key in
  # /etc/ceph/${cluster}.${mgr_name}.keyring on the machine where ceph-mgr is
  # deployed
  ceph-authtool /path/to/admin.keyring --add-key 'AQDN8kBe9PLWARAAZwxXMr+n85SBYbSlLcZnMA==' -n mgr.x \
    --cap mon 'allow profile mgr' --cap osd 'allow *' --cap mds 'allow *'
  # If your monitors' ids are not sorted by ip address, please specify them in order.
  # For example. if mon 'a' is 10.0.0.3, mon 'b' is 10.0.0.2, and mon 'c' is  10.0.0.4,
  # please passing "--mon-ids b a c".
  # In addition, if your monitors' ids are not single characters like 'a', 'b', 'c', please
  # specify them in the command line by passing them as arguments of the "--mon-ids"
  # option. if you are not sure, please check your ceph.conf to see if there is any
  # sections named like '[mon.foo]'. don't pass the "--mon-ids" option, if you are
  # using DNS SRV for looking up monitors.
  ceph-monstore-tool $ms rebuild -- --keyring /path/to/admin.keyring --mon-ids alpha beta gamma
  
  # make a backup of the corrupted store.db just in case!  repeat for
  # all monitors.
  mv /var/lib/ceph/mon/mon.foo/store.db /var/lib/ceph/mon/mon.foo/store.db.corrupted

  # move rebuild store.db into place.  repeat for all monitors.
  mv $ms/store.db /var/lib/ceph/mon/mon.foo/store.db
  chown -R ceph:ceph /var/lib/ceph/mon/mon.foo/store.db

This script performs the following steps:

#. Collects the map from each OSD host.
#. Rebuilds the store.
#. Fills the entities in the keyring file with appropriate capabilities.
#. Replaces the corrupted store on ``mon.foo`` with the recovered copy.


Known limitations
~~~~~~~~~~~~~~~~~

The above recovery tool is unable to recover the following information:

- **Certain added keyrings**: All of the OSD keyrings added using the ``ceph
  auth add`` command are recovered from the OSD's copy, and the
  ``client.admin`` keyring is imported using ``ceph-monstore-tool``. However,
  the MDS keyrings and all other keyrings will be missing in the recovered
  monitor store. You might need to manually re-add them.

- **Creating pools**: If any RADOS pools were in the process of being created,
  that state is lost. The recovery tool operates on the assumption that all
  pools have already been created. If there are PGs that are stuck in the
  'unknown' state after the recovery for a partially created pool, you can
  force creation of the *empty* PG by running the ``ceph osd force-create-pg``
  command. Note that this will create an *empty* PG, so take this action only
  if you know the pool is empty.

- **MDS Maps**: The MDS maps are lost.


Everything Failed! Now What?
============================

Reaching out for help
---------------------

You can find help on IRC in #ceph and #ceph-devel on OFTC (server
irc.oftc.net), or at ``dev@ceph.io`` and ``ceph-users@lists.ceph.com``. Make
sure that you have prepared your logs and that you have them ready upon
request.

See https://ceph.io/en/community/connect/ for current (as of October 2023)
information on getting in contact with the upstream Ceph community.


Preparing your logs
-------------------

The default location for monitor logs is ``/var/log/ceph/ceph-mon.FOO.log*``.
However, if they are not there, you can find their current location by running
the following command:

.. prompt:: bash

   ceph-conf --name mon.FOO --show-config-value log_file

The amount of information in the logs is determined by the debug levels in the
cluster's configuration files. If Ceph is using the default debug levels, then
your logs might be missing important information that would help the upstream
Ceph community address your issue.

To make sure your monitor logs contain relevant information, you can raise
debug levels. Here we are interested in information from the monitors.  As with
other components, the monitors have different parts that output their debug
information on different subsystems.

If you are an experienced Ceph troubleshooter, we recommend raising the debug
levels of the most relevant subsystems. Of course, this approach might not be
easy for beginners. In most cases, however, enough information to address the
issue will be secured if the following debug levels are entered::

      debug_mon = 10
      debug_ms = 1

Sometimes these debug levels do not yield enough information. In such cases,
members of the upstream Ceph community might ask you to make additional changes
to these or to other debug levels. In any case, it is better for us to receive
at least some useful information than to receive an empty log.


Do I need to restart a monitor to adjust debug levels?
------------------------------------------------------

No, restarting a monitor is not necessary. Debug levels may be adjusted by
using two different methods, depending on whether or not there is a quorum:

There is a quorum

  Either inject the debug option into the specific monitor that needs to 
  be debugged::

        ceph tell mon.FOO config set debug_mon 10/10

  Or inject it into all monitors at once::

        ceph tell mon.* config set debug_mon 10/10


There is no quorum

  Use the admin socket of the specific monitor that needs to be debugged
  and directly adjust the monitor's configuration options::

      ceph daemon mon.FOO config set debug_mon 10/10


To return the debug levels to their default values, run the above commands
using the debug level ``1/10`` rather than ``10/10``. To check a monitor's
current values, use the admin socket and run either of the following commands:

  .. prompt:: bash

     ceph daemon mon.FOO config show

or:

  .. prompt:: bash

     ceph daemon mon.FOO config get 'OPTION_NAME'



I Reproduced the problem with appropriate debug levels. Now what?
-----------------------------------------------------------------

We prefer that you send us only the portions of your logs that are relevant to
your monitor problems. Of course, it might not be easy for you to determine
which portions are relevant so we are willing to accept complete and
unabridged logs. However, we request that you avoid sending logs containing
hundreds of thousands of lines with no additional clarifying information. One
common-sense way of making our task easier is to write down the current time
and date when you are reproducing the problem and then extract portions of your
logs based on that information.

Finally, reach out to us on the mailing lists or IRC or Slack, or by filing a
new issue on the `tracker`_.

.. _tracker: http://tracker.ceph.com/projects/ceph/issues/new

.. |---|   unicode:: U+2014 .. EM DASH
   :trim:
