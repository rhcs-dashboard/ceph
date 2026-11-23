import { Injectable, NgModule } from '@angular/core';
import { ActivatedRouteSnapshot, PreloadAllModules, RouterModule, Routes } from '@angular/router';

import _ from 'lodash';

import { CephfsListComponent } from './ceph/cephfs/cephfs-list/cephfs-list.component';
import { ConfigurationFormComponent } from './ceph/cluster/configuration/configuration-form/configuration-form.component';
import { ConfigurationResourceBreadcrumbResolver } from './ceph/cluster/configuration/configuration-resource-page/configuration-resource-breadcrumb.resolver';
import { ConfigurationResourcePageComponent } from './ceph/cluster/configuration/configuration-resource-page/configuration-resource-page.component';
import { ConfigurationResourceSidebarComponent } from './ceph/cluster/configuration/configuration-resource-sidebar/configuration-resource-sidebar.component';
import { ConfigurationComponent } from './ceph/cluster/configuration/configuration.component';
import { CreateClusterComponent } from './ceph/cluster/create-cluster/create-cluster.component';
import { CrushmapComponent } from './ceph/cluster/crushmap/crushmap.component';
import { HostSidebarComponent } from './ceph/cluster/hosts/host-resource-sidebar/host-resource-sidebar.component';
import { HostFormComponent } from './ceph/cluster/hosts/host-form/host-form.component';
import { HostResourceBreadcrumbResolver } from './ceph/cluster/hosts/host-resource-page/host-resource-breadcrumb.resolver';
import { HostResourcePageComponent } from './ceph/cluster/hosts/host-resource-page/host-resource-page.component';
import { HostsComponent } from './ceph/cluster/hosts/hosts.component';
import { InventoryComponent } from './ceph/cluster/inventory/inventory.component';
import { LogsComponent } from './ceph/cluster/logs/logs.component';
import { MgrModuleFormComponent } from './ceph/cluster/mgr-modules/mgr-module-form/mgr-module-form.component';
import { MgrModuleListComponent } from './ceph/cluster/mgr-modules/mgr-module-list/mgr-module-list.component';
import { MgrModuleResourceBreadcrumbResolver } from './ceph/cluster/mgr-modules/mgr-module-resource-page/mgr-module-resource-breadcrumb.resolver';
import { MgrModuleResourcePageComponent } from './ceph/cluster/mgr-modules/mgr-module-resource-page/mgr-module-resource-page.component';
import { MgrModuleResourceSidebarComponent } from './ceph/cluster/mgr-modules/mgr-module-resource-sidebar/mgr-module-resource-sidebar.component';
import { MonitorComponent } from './ceph/cluster/monitor/monitor.component';
import { OsdFormComponent } from './ceph/cluster/osd/osd-form/osd-form.component';
import { OsdListComponent } from './ceph/cluster/osd/osd-list/osd-list.component';
import { ActiveAlertListComponent } from './ceph/cluster/prometheus/active-alert-list/active-alert-list.component';
import { RulesListComponent } from './ceph/cluster/prometheus/rules-list/rules-list.component';
import { SilenceFormComponent } from './ceph/cluster/prometheus/silence-form/silence-form.component';
import { SilenceListComponent } from './ceph/cluster/prometheus/silence-list/silence-list.component';
import { ServiceFormComponent } from './ceph/cluster/services/service-form/service-form.component';
import { ServiceResourceBreadcrumbResolver } from './ceph/cluster/services/service-resource-page/service-resource-breadcrumb.resolver';
import { ServiceResourcePageComponent } from './ceph/cluster/services/service-resource-page/service-resource-page.component';
import { ServiceResourceSidebarComponent } from './ceph/cluster/services/service-resource-sidebar/service-resource-sidebar.component';
import { SERVICES_PAGE_HEADER } from './ceph/cluster/services/service-type-catalog';
import { ServicesComponent } from './ceph/cluster/services/services.component';
import { TelemetryComponent } from './ceph/cluster/telemetry/telemetry.component';
import { PerformanceCounterComponent } from './ceph/performance-counter/performance-counter/performance-counter.component';
import { LoginPasswordFormComponent } from './core/auth/login-password-form/login-password-form.component';
import { LoginComponent } from './core/auth/login/login.component';
import { UserPasswordFormComponent } from './core/auth/user-password-form/user-password-form.component';
import { ErrorComponent } from './core/error/error.component';
import { ModuleStatusPromptComponent } from './core/error/module-status-prompt/module-status-prompt.component';
import { BlankLayoutComponent } from './core/layouts/blank-layout/blank-layout.component';
import { LoginLayoutComponent } from './core/layouts/login-layout/login-layout.component';
import { WorkbenchLayoutComponent } from './core/layouts/workbench-layout/workbench-layout.component';
import { ApiDocsComponent } from './core/navigation/api-docs/api-docs.component';
import {
  ActionLabels,
  CEPHFS_MIRRORING_PAGE_HEADER,
  URLVerbs
} from './shared/constants/app.constants';
import { CrudFormComponent } from './shared/forms/crud-form/crud-form.component';
import { CRUDTableComponent } from './shared/datatable/crud-table/crud-table.component';
import { BreadcrumbsResolver, IBreadcrumb } from './shared/models/breadcrumbs';
import { AuthGuardService } from './shared/services/auth-guard.service';
import { ChangePasswordGuardService } from './shared/services/change-password-guard.service';
import { FeatureTogglesGuardService } from './shared/services/feature-toggles-guard.service';
import { ModuleStatusGuardService } from './shared/services/module-status-guard.service';
import { NoSsoGuardService } from './shared/services/no-sso-guard.service';
import { PermissionGuardService } from './shared/services/permission-guard.service';
import { UpgradeComponent } from './ceph/cluster/upgrade/upgrade.component';
import { CephfsVolumeFormComponent } from './ceph/cephfs/cephfs-form/cephfs-form.component';
import { UpgradeProgressComponent } from './ceph/cluster/upgrade/upgrade-progress/upgrade-progress.component';
import { MultiClusterComponent } from './ceph/cluster/multi-cluster/multi-cluster.component';
import { MultiClusterListComponent } from './ceph/cluster/multi-cluster/multi-cluster-list/multi-cluster-list.component';
import { nfsParentRoute } from './ceph/nfs/nfs.routes';
import { smbParentRoute } from './ceph/smb/smb.routes';
import { MultiClusterFormComponent } from './ceph/cluster/multi-cluster/multi-cluster-form/multi-cluster-form.component';
import { CephfsMirroringListComponent } from './ceph/cephfs/cephfs-mirroring-list/cephfs-mirroring-list.component';
import { CephfsAddMirroringPathComponent } from './ceph/cephfs/cephfs-add-mirroring-path/cephfs-add-mirroring-path.component';
import { CephfsMirroringFsTabsComponent } from './ceph/cephfs/cephfs-mirroring-fs-tabs/cephfs-mirroring-fs-tabs.component';
import { CephfsMirroringFsOverviewComponent } from './ceph/cephfs/cephfs-mirroring-fs-overview/cephfs-mirroring-fs-overview.component';
import { CephfsMirroringFsMirrorPathsComponent } from './ceph/cephfs/cephfs-mirroring-fs-mirror-paths/cephfs-mirroring-fs-mirror-paths.component';
import { CephfsMirroringFsBreadcrumbResolver } from './ceph/cephfs/cephfs-mirroring-fs-tabs/cephfs-mirroring-fs-breadcrumb.resolver';
import { NotificationsPageComponent } from './core/navigation/notification-panel/notifications-page/notifications-page.component';
import { CephfsMirroringErrorComponent } from './ceph/cephfs/cephfs-mirroring-error/cephfs-mirroring-error.component';
import { OverviewComponent } from './ceph/overview/overview.component';

@Injectable()
export class PerformanceCounterBreadcrumbsResolver extends BreadcrumbsResolver {
  resolve(route: ActivatedRouteSnapshot) {
    const result: IBreadcrumb[] = [];

    const fromPath = route.queryParams.fromLink || null;
    let fromText = '';
    switch (fromPath) {
      case '/monitor':
        fromText = 'Monitors';
        break;
      case '/hosts':
        fromText = 'Hosts';
        break;
    }
    result.push({ text: 'Cluster', path: null });
    result.push({ text: fromText, path: fromPath });
    result.push({ text: 'Performance Counters', path: '' });

    return result;
  }
}

@Injectable()
export class StartCaseBreadcrumbsResolver extends BreadcrumbsResolver {
  resolve(route: ActivatedRouteSnapshot) {
    const path = route.params.name;
    const text = _.startCase(path);
    return [{ text: `${text}/Edit`, path: path }];
  }
}

const routes: Routes = [
  // Overview
  { path: '', redirectTo: 'overview', pathMatch: 'full' },
  { path: 'api-docs', component: ApiDocsComponent },
  {
    path: '',
    component: WorkbenchLayoutComponent,
    canActivate: [AuthGuardService, ChangePasswordGuardService],
    canActivateChild: [AuthGuardService, ChangePasswordGuardService],
    children: [
      { path: 'overview', component: OverviewComponent },
      { path: 'error', component: ErrorComponent },
      {
        path: 'cephfs/mirroring/error',
        component: CephfsMirroringErrorComponent,
        data: {
          breadcrumbs: 'File/Mirroring',
          pageHeader: CEPHFS_MIRRORING_PAGE_HEADER
        }
      },

      // Cluster
      {
        path: 'notifications',
        data: {
          breadcrumbs: 'Overview/Notifications'
        },
        component: NotificationsPageComponent
      },
      {
        path: 'add-storage',
        component: CreateClusterComponent,
        canActivate: [ModuleStatusGuardService, PermissionGuardService],
        data: {
          moduleStatusGuardConfig: {
            uiApiPath: 'orchestrator',
            redirectTo: 'overview',
            backend: 'cephadm'
          },
          permissionGuardConfig: {
            scope: 'configOpt',
            action: 'update',
            redirectTo: '/overview'
          }
        }
      },
      {
        path: 'hosts',
        component: HostsComponent,
        data: { breadcrumbs: 'Cluster/Hosts' },
        children: [
          {
            path: URLVerbs.ADD,
            component: HostFormComponent,
            outlet: 'modal'
          }
        ]
      },
      {
        path: 'hosts/:hostname',
        component: HostSidebarComponent,
        data: {
          breadcrumbs: HostResourceBreadcrumbResolver,
          showBreadcrumbsLayout: false
        },
        children: [
          { path: '', redirectTo: 'overview', pathMatch: 'full' },
          {
            path: 'overview',
            component: HostResourcePageComponent,
            data: { breadcrumbs: 'Overview', section: 'overview' }
          },
          {
            path: 'storage-devices',
            component: HostResourcePageComponent,
            data: { breadcrumbs: 'Storage Devices', section: 'storage-devices' }
          },
          {
            path: 'daemons',
            component: HostResourcePageComponent,
            data: { breadcrumbs: 'Service instances', section: 'daemons' }
          },
          {
            path: 'performance',
            component: HostResourcePageComponent,
            data: { breadcrumbs: 'Performance', section: 'performance' }
          }
        ]
      },
      {
        path: 'ceph-users',
        component: CRUDTableComponent,
        data: {
          breadcrumbs: 'Administration/Ceph Users',
          resource: 'api.cluster.user@1.0'
        }
      },
      {
        path: 'cluster/user/create',
        component: CrudFormComponent,
        data: {
          breadcrumbs: 'Administration/Ceph Users/Create',
          resource: 'api.cluster.user@1.0'
        }
      },
      {
        path: 'cluster/user/import',
        component: CrudFormComponent,
        data: {
          breadcrumbs: 'Administration/Ceph Users/Import',
          resource: 'api.cluster.user@1.0'
        }
      },
      {
        path: 'cluster/user/edit',
        component: CrudFormComponent,
        data: {
          breadcrumbs: 'Administration/Ceph Users/Edit',
          resource: 'api.cluster.user@1.0'
        }
      },
      {
        path: 'monitor',
        component: MonitorComponent,
        data: { breadcrumbs: 'Cluster/Monitors' }
      },
      {
        path: 'services',
        canActivate: [ModuleStatusGuardService],
        data: {
          moduleStatusGuardConfig: {
            uiApiPath: 'orchestrator',
            redirectTo: 'services/unavailable',
            section: 'orch',
            section_info: 'Orchestrator',
            header: $localize`Orchestrator is not available`,
            navigate_to: 'services'
          },
          breadcrumbs: 'Administration/Services'
        },
        children: [
          {
            path: 'unavailable',
            component: ModuleStatusPromptComponent,
            data: {
              pageHeader: {
                title: $localize`Services`,
                description: $localize`Services deployed by the orchestrator.`
              }
            }
          },
          {
            path: '',
            component: ServicesComponent,
            data: { pageHeader: SERVICES_PAGE_HEADER }
          },
          {
            // Keep ahead of :service_name so "create" is not treated as a service name.
            path: URLVerbs.CREATE,
            component: ServiceFormComponent,
            data: { breadcrumbs: ActionLabels.CREATE }
          },
          {
            path: `${URLVerbs.CREATE}/:type`,
            component: ServiceFormComponent,
            data: { breadcrumbs: ActionLabels.CREATE }
          },
          {
            path: `${URLVerbs.EDIT}/:type/:name`,
            component: ServiceFormComponent,
            data: { breadcrumbs: ActionLabels.EDIT }
          },
          {
            path: ':service_name',
            component: ServiceResourceSidebarComponent,
            data: {
              breadcrumbs: ServiceResourceBreadcrumbResolver,
              showBreadcrumbsLayout: false
            },
            children: [
              { path: '', redirectTo: 'overview', pathMatch: 'full' },
              {
                path: 'overview',
                component: ServiceResourcePageComponent,
                data: { breadcrumbs: 'Overview', section: 'overview' }
              },
              {
                path: 'service-instances',
                component: ServiceResourcePageComponent,
                data: { breadcrumbs: 'Service Instances', section: 'service-instances' }
              },
              {
                path: 'certificate',
                component: ServiceResourcePageComponent,
                data: { breadcrumbs: 'Certificate', section: 'certificate' }
              },
              {
                path: 'events',
                component: ServiceResourcePageComponent,
                data: { breadcrumbs: 'Service Events', section: 'events' }
              }
            ]
          }
        ]
      },
      {
        path: 'multi-cluster',
        children: [
          {
            path: 'overview',
            component: MultiClusterComponent
          },
          {
            path: 'manage-clusters',
            data: { breadcrumbs: 'Multi-Cluster/Manage Clusters' },

            children: [
              { path: '', component: MultiClusterListComponent },
              {
                path: URLVerbs.CONNECT,
                component: MultiClusterFormComponent,
                data: { breadcrumbs: ActionLabels.CONNECT }
              },
              {
                path: `${URLVerbs.EDIT}/:name`,
                component: MultiClusterFormComponent,
                data: { breadcrumbs: ActionLabels.EDIT }
              },
              {
                path: `${URLVerbs.RECONNECT}/:name`,
                component: MultiClusterFormComponent,
                data: { breadcrumbs: ActionLabels.RECONNECT }
              }
            ]
          }
        ]
      },
      {
        path: 'inventory/unavailable',
        component: ModuleStatusPromptComponent,
        data: {
          breadcrumbs: 'Cluster/Physical Disks',
          pageHeader: {
            title: $localize`Physical Disks`,
            description: $localize`Disks reported by the orchestrator.`
          },
          moduleStatusGuardConfig: {
            uiApiPath: 'orchestrator',
            redirectTo: 'inventory/unavailable',
            section: 'orch',
            section_info: 'Orchestrator',
            header: $localize`Orchestrator is not available`,
            navigate_to: 'inventory'
          }
        }
      },
      {
        path: 'inventory',
        canActivate: [ModuleStatusGuardService],
        component: InventoryComponent,
        data: {
          moduleStatusGuardConfig: {
            uiApiPath: 'orchestrator',
            redirectTo: 'inventory/unavailable',
            section: 'orch',
            section_info: 'Orchestrator',
            header: $localize`Orchestrator is not available`,
            navigate_to: 'inventory'
          },
          breadcrumbs: 'Cluster/Physical Disks'
        }
      },
      {
        path: 'osd',
        component: OsdListComponent,
        data: { breadcrumbs: 'Cluster/OSDs' },
        children: [
          {
            path: URLVerbs.CREATE,
            component: OsdFormComponent,
            outlet: 'modal'
          }
        ]
      },
      {
        path: 'configuration',
        data: { breadcrumbs: 'Administration/Configuration' },
        children: [
          { path: '', component: ConfigurationComponent },
          {
            path: 'edit/:name',
            component: ConfigurationFormComponent,
            data: { breadcrumbs: ActionLabels.EDIT }
          },
          {
            path: ':name',
            component: ConfigurationResourceSidebarComponent,
            data: {
              breadcrumbs: ConfigurationResourceBreadcrumbResolver,
              showBreadcrumbsLayout: false
            },
            children: [
              { path: '', redirectTo: 'overview', pathMatch: 'full' },
              {
                path: 'overview',
                component: ConfigurationResourcePageComponent,
                data: { breadcrumbs: 'Overview', section: 'overview' }
              }
            ]
          }
        ]
      },
      {
        path: 'crush-map',
        component: CrushmapComponent,
        data: { breadcrumbs: 'Cluster/CRUSH map' }
      },
      {
        path: 'logs',
        component: LogsComponent,
        data: { breadcrumbs: 'Observability/Logs' }
      },
      {
        path: 'telemetry',
        component: TelemetryComponent,
        data: { breadcrumbs: 'Telemetry configuration' }
      },
      {
        path: 'monitoring',
        data: { breadcrumbs: 'Observability/Alerts' },
        children: [
          { path: '', redirectTo: 'active-alerts', pathMatch: 'full' },
          {
            path: 'active-alerts',
            data: { breadcrumbs: 'Active Alerts' },
            component: ActiveAlertListComponent
          },
          {
            path: 'alerts',
            data: { breadcrumbs: 'Alert Rules' },
            component: RulesListComponent
          },
          {
            path: 'silences',
            data: { breadcrumbs: 'Silences' },
            children: [
              {
                path: '',
                component: SilenceListComponent
              },
              {
                path: URLVerbs.CREATE,
                component: SilenceFormComponent,
                data: { breadcrumbs: `${ActionLabels.CREATE} Silence` }
              },
              {
                path: `${URLVerbs.CREATE}/:id`,
                component: SilenceFormComponent,
                data: { breadcrumbs: ActionLabels.CREATE }
              },
              {
                path: `${URLVerbs.EDIT}/:id`,
                component: SilenceFormComponent,
                data: { breadcrumbs: ActionLabels.EDIT }
              },
              {
                path: `${URLVerbs.RECREATE}/:id`,
                component: SilenceFormComponent,
                data: { breadcrumbs: ActionLabels.RECREATE }
              }
            ]
          }
        ]
      },
      {
        path: 'upgrade/unavailable',
        component: ModuleStatusPromptComponent,
        data: {
          breadcrumbs: 'Administration/Upgrade',
          pageHeader: {
            title: $localize`Upgrade`,
            description: $localize`Upgrade the cluster with the orchestrator.`
          },
          moduleStatusGuardConfig: {
            uiApiPath: 'orchestrator',
            redirectTo: 'upgrade/unavailable',
            backend: 'cephadm',
            section: 'orch',
            section_info: 'Orchestrator',
            header: $localize`Orchestrator is not available`,
            navigate_to: 'upgrade'
          }
        }
      },
      {
        path: 'upgrade',
        canActivate: [ModuleStatusGuardService],
        data: {
          moduleStatusGuardConfig: {
            uiApiPath: 'orchestrator',
            redirectTo: 'upgrade/unavailable',
            backend: 'cephadm',
            section: 'orch',
            section_info: 'Orchestrator',
            header: $localize`Orchestrator is not available`,
            navigate_to: 'upgrade'
          },
          breadcrumbs: 'Administration/Upgrade'
        },
        children: [
          {
            path: '',
            component: UpgradeComponent
          },
          {
            path: 'progress',
            component: UpgradeProgressComponent,
            data: { breadcrumbs: 'Progress' }
          }
        ]
      },
      {
        path: 'perf_counters/:type/:id',
        component: PerformanceCounterComponent,
        data: {
          breadcrumbs: PerformanceCounterBreadcrumbsResolver
        }
      },
      // Mgr modules
      {
        path: 'mgr-modules',
        data: { breadcrumbs: 'Administrator/Manager Modules' },
        children: [
          {
            path: '',
            component: MgrModuleListComponent
          },
          {
            path: 'edit/:name',
            component: MgrModuleFormComponent,
            data: {
              breadcrumbs: StartCaseBreadcrumbsResolver
            }
          },
          {
            path: ':name',
            component: MgrModuleResourceSidebarComponent,
            data: {
              breadcrumbs: MgrModuleResourceBreadcrumbResolver,
              showBreadcrumbsLayout: false
            },
            children: [
              { path: '', redirectTo: 'overview', pathMatch: 'full' },
              {
                path: 'overview',
                component: MgrModuleResourcePageComponent,
                data: { breadcrumbs: 'Overview', section: 'overview' }
              }
            ]
          }
        ]
      },
      // Pools
      {
        path: 'pool',
        data: { breadcrumbs: 'Cluster/Pools' },
        loadChildren: () => import('./ceph/pool/pool.module').then((m) => m.RoutedPoolModule)
      },
      // Block
      {
        path: 'block',
        data: { breadcrumbs: true, text: 'Block', path: null },
        loadChildren: () => import('./ceph/block/block.module').then((m) => m.RoutedBlockModule)
      },
      // File Systems
      {
        path: 'cephfs',
        canActivate: [FeatureTogglesGuardService],
        children: [
          {
            path: 'fs',
            component: CephfsListComponent,
            data: { breadcrumbs: 'File/File Systems' }
          },
          {
            path: `fs/${URLVerbs.CREATE}`,
            component: CephfsVolumeFormComponent,
            data: { breadcrumbs: ActionLabels.CREATE }
          },
          {
            path: `fs/${URLVerbs.EDIT}/:id`,
            component: CephfsVolumeFormComponent,
            data: { breadcrumbs: ActionLabels.EDIT }
          },
          {
            path: 'mirroring',
            canActivate: [ModuleStatusGuardService],
            data: {
              moduleStatusGuardConfig: {
                uiApiPath: 'cephfs/mirror',
                redirectTo: 'cephfs/mirroring/error',
                module_name: 'mirroring',
                navigate_to: 'File/Mirroring'
              }
            },
            children: [
              {
                path: '',
                component: CephfsMirroringListComponent,
                data: {
                  breadcrumbs: 'File/Mirroring',
                  pageHeader: CEPHFS_MIRRORING_PAGE_HEADER
                },
                children: [
                  {
                    path: 'add-path/:fsId/:fsName',
                    component: CephfsAddMirroringPathComponent,
                    outlet: 'modal'
                  }
                ]
              },
              {
                path: ':fsName',
                component: CephfsMirroringFsTabsComponent,
                data: {
                  breadcrumbs: CephfsMirroringFsBreadcrumbResolver,
                  // PageHeader included within the CephfsMirroringFsTabsComponent
                  pageHeaderHidden: true
                },
                children: [
                  { path: '', redirectTo: 'overview', pathMatch: 'full' },
                  {
                    path: 'overview',
                    component: CephfsMirroringFsOverviewComponent
                  },
                  {
                    path: 'mirror-paths',
                    component: CephfsMirroringFsMirrorPathsComponent
                  }
                ]
              }
            ]
          },
          nfsParentRoute(false, 'File/NFS'),
          smbParentRoute(false, 'File/SMB')
        ]
      },
      // Object Gateway
      {
        path: 'rgw/unavailable',
        component: ModuleStatusPromptComponent,
        data: {
          breadcrumbs: 'Object',
          pageHeader: {
            title: $localize`Object`,
            description: $localize`Manage buckets, users, and the Object Gateway.`
          },
          moduleStatusGuardConfig: {
            uiApiPath: 'rgw',
            redirectTo: 'rgw/unavailable',
            section: 'rgw',
            section_info: 'Object Gateway',
            header: $localize`The Object Gateway service is not configured`,
            button_name: $localize`Create Object Gateway`,
            button_route: '/services/create/rgw',
            navigate_to: 'rgw/overview'
          }
        }
      },
      {
        path: 'rgw',
        canActivate: [FeatureTogglesGuardService, ModuleStatusGuardService],
        data: {
          moduleStatusGuardConfig: {
            uiApiPath: 'rgw',
            redirectTo: 'rgw/unavailable',
            section: 'rgw',
            section_info: 'Object Gateway',
            header: $localize`The Object Gateway service is not configured`,
            button_name: $localize`Create Object Gateway`,
            button_route: '/services/create/rgw',
            navigate_to: 'rgw/overview'
          },
          breadcrumbs: true,
          text: 'Object',
          path: null
        },
        loadChildren: () => import('./ceph/rgw/rgw.module').then((m) => m.RoutedRgwModule)
      },
      // User/Role Management
      {
        path: 'user-management',
        data: { breadcrumbs: 'User management', path: null },
        loadChildren: () => import('./core/auth/auth.module').then((m) => m.RoutedAuthModule)
      },
      // User Profile
      {
        path: 'user-profile',
        data: { breadcrumbs: 'User profile', path: null },
        children: [
          {
            path: URLVerbs.EDIT,
            component: UserPasswordFormComponent,
            canActivate: [NoSsoGuardService],
            data: { breadcrumbs: ActionLabels.EDIT }
          }
        ]
      }
    ]
  },
  {
    path: '',
    component: LoginLayoutComponent,
    children: [
      { path: 'login', component: LoginComponent },
      {
        path: 'login-change-password',
        component: LoginPasswordFormComponent,
        canActivate: [NoSsoGuardService]
      }
    ]
  },
  {
    path: '',
    component: BlankLayoutComponent,
    children: [{ path: '**', redirectTo: '/error' }]
  }
];

@NgModule({
  imports: [
    ModuleStatusPromptComponent,
    RouterModule.forRoot(routes, {
      useHash: true,
      preloadingStrategy: PreloadAllModules
    })
  ],
  exports: [RouterModule],
  providers: [StartCaseBreadcrumbsResolver, PerformanceCounterBreadcrumbsResolver]
})
export class AppRoutingModule {}
