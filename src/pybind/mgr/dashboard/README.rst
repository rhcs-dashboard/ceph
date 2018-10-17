Dashboard and Administration Module for Ceph Manager
=========================================================================

Overview
--------

The original Ceph Manager Dashboard that was shipped with Ceph "Luminous"
started out as a simple read-only view into various run-time information and
performance data of a Ceph cluster.

However, there is a `growing demand <http://pad.ceph.com/p/mimic-dashboard>`_
for adding more web-based management capabilities, to make it easier for
administrators that prefer a WebUI over the command line.

This module is an ongoing project to add a native web based monitoring and
administration application to Ceph Manager. It aims at becoming a successor of
the existing dashboard, which provides read-only functionality and uses a
simpler architecture to achieve the original goal.

The code and architecture of this module is derived from and inspired by the
`openATTIC Ceph management and monitoring tool <https://openattic.org/>`_ (both
the backend and WebUI). The development is actively driven by the team behind
openATTIC.

The intention is to reuse as much of the existing openATTIC code as possible,
while adapting it to the different environment. The current openATTIC backend
implementation is based on Django and the Django REST framework, the Manager
module's backend code will use the CherryPy framework and a custom REST API
implementation instead.

The WebUI implementation will be developed using Angular/TypeScript, merging
both functionality from the existing dashboard as well as adding new
functionality originally developed for the standalone version of openATTIC.

The porting and migration of the existing openATTIC and dashboard functionality
will be done in stages. The tasks are currently tracked in the `openATTIC team's
JIRA instance <https://tracker.openattic.org/browse/OP-3039>`_.

Enabling and Starting the Dashboard
-----------------------------------

If you have installed Ceph from distribution packages, the package management
system should have taken care of installing all the required dependencies.

If you want to start the dashboard from within a development environment, you
need to have built Ceph (see the toplevel ``README.md`` file and the `developer
documentation <http://docs.ceph.com/docs/master/dev/>`_ for details on how to
accomplish this.

Finally, you need to build the dashboard frontend code. See the file
``HACKING.rst`` in this directory for instructions on setting up the necessary
development environment.

From within a running Ceph cluster, you can start the Dashboard module by
running the following command::

  $ ceph mgr module enable dashboard

You can see currently enabled Manager modules with::

  $ ceph mgr module ls

In order to be able to log in, you need to define a username and password, which
will be stored in the MON's configuration database::

  $ ceph dashboard set-login-credentials <username> <password>

The password will be stored as a hash using ``bcrypt``.

The Dashboard's WebUI should then be reachable on TCP port 8080.

Enabling the Object Gateway management frontend
-----------------------------------------------

If you want to use the Object Gateway management functionality of the
dashboard, you will need to provide credentials. If you do not have a user
which shall be used for providing those credentials, you will also need to
create one::

  $ radosgw-admin user create --uuid=<user> --display-name=<display-name> \
      --system

The credentials of a user can also be obtained by using `radosgw-admin`::

  $ radosgw-admin user info --uid=<user>

Finally, set the credentials to the dashboard module::

  $ ceph dashboard set-rgw-api-secret-key <secret_key>
  $ ceph dashboard set-rgw-api-access-key <access_key>

This is all you have to do to get the Object Gateway management functionality
working. The host and port of the Object Gateway are determined automatically.
If multiple zones are used, it will automatically determine the host within the
master zone group and master zone. This should be sufficient for most setups,
but in some circumstances you might want to set the host and port manually::

  $ ceph dashboard set-rgw-api-host <host>
  $ ceph dashboard set-rgw-api-port <port>

In addition to the settings mentioned so far, the following settings do also
exist and you may find yourself in the situation that you have to use them::

  $ ceph dashboard set-rgw-api-scheme <scheme>  # http or https
  $ ceph dashboard set-rgw-api-admin-resource <admin-resource>
  $ ceph dashboard set-rgw-api-user-id <user-id>

Working on the Dashboard Code
-----------------------------

If you're interested in helping with the development of the dashboard, please
see the file ``HACKING.rst`` for details on how to set up a development
environment and some other development-related topics.
