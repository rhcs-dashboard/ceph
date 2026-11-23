import { HttpClient } from '@angular/common/http';
import { Component, Input, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { ButtonModule, GridModule, NotificationModule, TilesModule } from 'carbon-components-angular';

import { MgrModuleService } from '~/app/shared/api/mgr-module.service';
import { NotificationType } from '~/app/shared/enum/notification-type.enum';
import { AuthStorageService } from '~/app/shared/services/auth-storage.service';
import { DocService } from '~/app/shared/services/doc.service';
import { NotificationService } from '~/app/shared/services/notification.service';

type PromptMode = 'enable' | 'configure' | 'link' | 'info';

interface EnableCopy {
  title: string;
  detail: string;
  button: string;
}

const ENABLE_COPY: Record<string, EnableCopy> = {
  nfs: {
    title: $localize`NFS is not enabled`,
    detail: $localize`Enable the NFS manager module to manage exports from this page.`,
    button: $localize`Enable NFS`
  },
  smb: {
    title: $localize`SMB is not enabled`,
    detail: $localize`Enable the SMB manager module to manage shares from this page.`,
    button: $localize`Enable SMB`
  },
  mirroring: {
    title: $localize`CephFS Mirroring is not enabled`,
    detail: $localize`Enable the CephFS Mirroring module to create mirror links from this page.`,
    button: $localize`Enable CephFS Mirroring`
  }
};

@Component({
  selector: 'cd-module-status-prompt',
  templateUrl: './module-status-prompt.component.html',
  styleUrls: ['./module-status-prompt.component.scss'],
  standalone: true,
  imports: [ButtonModule, NotificationModule, TilesModule, GridModule]
})
export class ModuleStatusPromptComponent implements OnInit {
  @Input() embedded = false;
  @Input() reason = '';
  @Input() header = '';
  @Input() message = '';
  @Input() moduleName = '';
  @Input() buttonLabel = '';
  @Input() buttonRoute: string | string[] = '';
  @Input() buttonTitle = '';
  @Input() uiConfig = false;
  @Input() uiApiPath = '';
  @Input() navigateTo = '';
  @Input() section = '';
  @Input() sectionInfo = '';
  @Input() componentName = '';
  @Input() modules: string[] = [];

  loading = true;
  mode: PromptMode = 'info';
  title = '';
  detail = '';
  actionTitle = '';
  actionText = '';
  canEnable = false;
  docUrl = '';
  permissionNotice = $localize`An administrator with configuration access can enable this module.`;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private mgrModuleService: MgrModuleService,
    private authStorageService: AuthStorageService,
    private notificationService: NotificationService,
    private docService: DocService
  ) {}

  ngOnInit(): void {
    this.canEnable = !!this.authStorageService.getPermissions()?.configOpt?.update;
    if (this.embedded) {
      this.applyView();
      this.loading = false;
      return;
    }
    this.loadFromRoute();
  }

  enableModule(): void {
    const modules = this.modules.length ? this.modules : [this.moduleName];
    this.mgrModuleService.updateModuleState(
      modules,
      false,
      null,
      this.navigateTo,
      $localize`Module enabled`,
      true,
      $localize`Enabling the module. Reconnecting, please wait ...`
    );
  }

  configure(): void {
    const returnPath = this.navigateTo || this.uiApiPath;
    this.http.post(`ui-api/${this.uiApiPath}/configure`, {}).subscribe({
      next: () => {
        this.notificationService.show(
          NotificationType.info,
          $localize`Configuring ${this.componentName || this.header}`
        );
      },
      error: (error: any) => {
        this.notificationService.show(NotificationType.error, error);
      },
      complete: () => {
        setTimeout(() => {
          this.router.navigate([returnPath]);
          this.notificationService.show(
            NotificationType.success,
            $localize`Configured ${this.componentName || this.header}`
          );
        }, 3000);
      }
    });
  }

  openLink(): void {
    if (Array.isArray(this.buttonRoute)) {
      this.router.navigate(this.buttonRoute);
      return;
    }
    if (this.buttonRoute) {
      this.router.navigateByUrl(this.buttonRoute);
    }
  }

  private loadFromRoute(): void {
    const config = this.route.snapshot.data?.['moduleStatusGuardConfig'] || {};
    this.header = config.header || this.header;
    this.moduleName = config.module_name || this.moduleName;
    this.buttonLabel = config.button_name || this.buttonLabel;
    this.buttonRoute = config.button_route || this.buttonRoute;
    this.buttonTitle = config.button_title || this.buttonTitle;
    this.uiConfig = !!config.uiConfig;
    this.uiApiPath = config.uiApiPath || this.uiApiPath;
    this.navigateTo = config.navigate_to || this.navigateTo;
    this.section = config.section || this.section;
    this.sectionInfo = config.section_info || this.sectionInfo;
    this.componentName = config.component || this.componentName;
    if (!this.uiApiPath) {
      this.applyView();
      this.loading = false;
      return;
    }
    this.http.get(`ui-api/${this.uiApiPath}/status`).subscribe({
      next: (status: any) => {
        if (status?.available) {
          this.loading = false;
          if (this.navigateTo) {
            this.router.navigate([this.navigateTo]);
          }
          return;
        }
        this.reason = status?.reason || '';
        this.message = status?.message || '';
        this.moduleName = status?.module || this.moduleName;
        this.applyView();
        this.loading = false;
      },
      error: () => {
        this.reason = this.reason || 'not_configured';
        this.applyView();
        this.loading = false;
      }
    });
  }

  private applyView(): void {
    const reason = this.resolveReason();
    this.reason = reason;
    this.docUrl = this.section ? this.docService.urlGenerator(this.section) : '';
    const enableCopy = ENABLE_COPY[this.moduleName];

    if (reason === 'module_disabled' && this.moduleName) {
      this.mode = 'enable';
      this.title = enableCopy?.title || $localize`This module is not enabled`;
      this.detail = this.message || enableCopy?.detail || '';
      this.actionTitle = enableCopy?.button || $localize`Enable module`;
      this.actionText = enableCopy?.detail || this.detail;
      this.buttonLabel = enableCopy?.button || this.buttonLabel || $localize`Enable module`;
      return;
    }

    if (reason === 'orchestrator_unavailable') {
      this.mode = 'info';
      this.title = this.header || $localize`Orchestrator is not available`;
      this.detail = this.message || '';
      this.actionTitle = this.title;
      this.actionText =
        this.sectionInfo
          ? $localize`The orchestrator has to be available before ${this.sectionInfo} can be managed from this page.`
          : this.detail;
      this.buttonLabel = '';
      return;
    }

    this.title = this.header || $localize`Not configured`;
    this.detail = this.message && this.message !== this.header ? this.message : '';
    this.actionTitle = this.header || $localize`Set up this page`;
    this.actionText = this.detail || $localize`Finish setup to use this page.`;
    if (this.uiConfig) {
      this.mode = 'configure';
      this.buttonLabel = this.buttonLabel || $localize`Configure`;
      return;
    }
    if (this.buttonRoute) {
      this.mode = 'link';
      this.buttonLabel = this.buttonLabel || $localize`Configure`;
      return;
    }
    this.mode = 'info';
    this.buttonLabel = '';
  }

  private resolveReason(): string {
    if (this.reason) {
      return this.reason;
    }
    if (this.section === 'orch') {
      return 'orchestrator_unavailable';
    }
    if (this.moduleName && !this.uiConfig && !this.buttonRoute) {
      return 'module_disabled';
    }
    return 'not_configured';
  }
}
