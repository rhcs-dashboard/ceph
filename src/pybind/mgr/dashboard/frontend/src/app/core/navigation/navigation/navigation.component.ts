import { Component, HostBinding, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';

import * as _ from 'lodash';
import { Subscription } from 'rxjs';
// import { AuthService } from '~/app/shared/api/auth.service';
// import { MgrModuleService } from '~/app/shared/api/mgr-module.service';
import { MultiClusterService } from '~/app/shared/api/multi-cluster.service';

import { Icons } from '~/app/shared/enum/icons.enum';
import { Permissions } from '~/app/shared/models/permissions';
import { AuthStorageService } from '~/app/shared/services/auth-storage.service';
import {
  FeatureTogglesMap$,
  FeatureTogglesService
} from '~/app/shared/services/feature-toggles.service';
import { MotdNotificationService } from '~/app/shared/services/motd-notification.service';
import { PrometheusAlertService } from '~/app/shared/services/prometheus-alert.service';
import { SummaryService } from '~/app/shared/services/summary.service';
import { TelemetryNotificationService } from '~/app/shared/services/telemetry-notification.service';

@Component({
  selector: 'cd-navigation',
  templateUrl: './navigation.component.html',
  styleUrls: ['./navigation.component.scss']
})
export class NavigationComponent implements OnInit, OnDestroy {
  notifications: string[] = [];
  clusterUrlTokenMap: Map<string, string> = new Map<string, string>();
  clusterTokenStatus: object;
  localClusterUrl: any;
  @HostBinding('class') get class(): string {
    return 'top-notification-' + this.notifications.length;
  }

  permissions: Permissions;
  enabledFeature$: FeatureTogglesMap$;
  summaryData: any;
  icons = Icons;

  rightSidebarOpen = false; // rightSidebar only opens when width is less than 768px
  showMenuSidebar = true;

  simplebar = {
    autoHide: false
  };
  displayedSubMenu = {};
  private subs = new Subscription();

  clusters: string[] = [];
  clustersMap: Map<string, any> = new Map<string, any>();
  selectedCluster: any;
  constructor(
    // private authService: AuthService,
    private authStorageService: AuthStorageService,
    private summaryService: SummaryService,
    private featureToggles: FeatureTogglesService,
    private telemetryNotificationService: TelemetryNotificationService,
    public prometheusAlertService: PrometheusAlertService,
    private motdNotificationService: MotdNotificationService,
    private router: Router,
    private multiClusterService: MultiClusterService // private mgrModuleService: MgrModuleService
  ) {
    this.permissions = this.authStorageService.getPermissions();
    this.enabledFeature$ = this.featureToggles.get();
  }

  ngOnInit() {
    this.subs.add(
      this.multiClusterService.subscribe((resp: string) => {
        this.localClusterUrl = resp['current_url'];
        resp['config']?.forEach((config: any) => {
          this.clustersMap.set(config['url'], {
            name: config['name'],
            helperText: config['helper_text']
          });
          config['token'] ? this.clusterUrlTokenMap.set(config['name'], config['token']): '';
        });

        this.selectedCluster =
          this.clustersMap.get(resp['current_url']) ||
          this.clustersMap.get(localStorage.getItem('cluster_api_url'));
        resp['config']?.forEach((config: any) => {
          if (config['name'] === this.selectedCluster) {
            localStorage.setItem('token_of_selected_cluster', config['token']);
          }
        });
      })
    );
    console.log();
    
    this.subs.add(
      this.summaryService.subscribe((summary) => {
        this.summaryData = summary;
      })
    );
    /*
     Note: If you're going to add more top notifications please do not forget to increase
     the number of generated css-classes in section topNotification settings in the scss
     file.
     */
    this.subs.add(
      this.authStorageService.isPwdDisplayed$.subscribe((isDisplayed) => {
        this.showTopNotification('isPwdDisplayed', isDisplayed);
      })
    );
    this.subs.add(
      this.telemetryNotificationService.update.subscribe((visible: boolean) => {
        this.showTopNotification('telemetryNotificationEnabled', visible);
      })
    );
    this.subs.add(
      this.motdNotificationService.motd$.subscribe((motd: any) => {
        this.showTopNotification('motdNotificationEnabled', _.isPlainObject(motd));
      })
    );
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  blockHealthColor() {
    if (this.summaryData && this.summaryData.rbd_mirroring) {
      if (this.summaryData.rbd_mirroring.errors > 0) {
        return { color: '#f4926c' };
      } else if (this.summaryData.rbd_mirroring.warnings > 0) {
        return { color: '#f0ad4e' };
      }
    }

    return undefined;
  }

  toggleSubMenu(menu: string) {
    this.displayedSubMenu[menu] = !this.displayedSubMenu[menu];
  }

  toggleRightSidebar() {
    this.rightSidebarOpen = !this.rightSidebarOpen;
  }

  showTopNotification(name: string, isDisplayed: boolean) {
    if (isDisplayed) {
      if (!this.notifications.includes(name)) {
        this.notifications.push(name);
      }
    } else {
      const index = this.notifications.indexOf(name);
      if (index >= 0) {
        this.notifications.splice(index, 1);
      }
    }
  }

  onDropDownSelection() {
    this.clusterTokenStatus = this.multiClusterService.checkTokenStatus(this.clusterUrlTokenMap).subscribe((data: any) => {
      this.clusterTokenStatus = data;
      console.log(this.clusterTokenStatus);
    });
  }

  onClusterSelection(url: string) {
    
    if (url !== this.localClusterUrl) {
      const clusterName = this.clustersMap.get(url).name;
      if (this.clusterTokenStatus[clusterName] === 1) {
        this.clustersMap.set(url, {
          is_token_expired : true
        });
      }
      else {
        this.multiClusterService.setCluster(url).subscribe(
          (resp: any) => {
            localStorage.setItem('cluster_api_url', url);
            this.selectedCluster = this.clustersMap.get(url);
            resp['config'].forEach((config: any) => {
              if (config['name'] === this.selectedCluster.name) {
                localStorage.setItem('token_of_selected_cluster', config['token']);
              }
            });        
          },
          () => {},
          () => {
            this.multiClusterService.refresh();
            this.summaryService.refresh();
            const currentRoute = this.router.url.split('?')[0];
            if (currentRoute.includes('dashboard')) {
              this.router.navigateByUrl('/pool', { skipLocationChange: true }).then(() => {
                this.router.navigate([currentRoute]);
              });
            } else {
              this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
                this.router.navigate([currentRoute]);
              });
            }
          }
        );
      }
    }
  }
}
