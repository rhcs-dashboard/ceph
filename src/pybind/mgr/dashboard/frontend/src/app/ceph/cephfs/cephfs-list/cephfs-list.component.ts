import { Component, OnInit } from '@angular/core';
import { Permissions } from '~/app/shared/models/permissions';
import { Router } from '@angular/router';

import _ from 'lodash';

import { CephfsService } from '~/app/shared/api/cephfs.service';
import { ConfigurationService } from '~/app/shared/api/configuration.service';
import { ListWithDetails } from '~/app/shared/classes/list-with-details.class';
import { CellTemplate } from '~/app/shared/enum/cell-template.enum';
import { ActionLabelsI18n } from '~/app/shared/constants/app.constants';
import { Icons } from '~/app/shared/enum/icons.enum';
import { CriticalConfirmationModalComponent } from '~/app/shared/components/critical-confirmation-modal/critical-confirmation-modal.component';
import { NotificationType } from '~/app/shared/enum/notification-type.enum';
import { FormModalComponent } from '~/app/shared/components/form-modal/form-modal.component';
import { CdTableAction } from '~/app/shared/models/cd-table-action';
import { CdTableColumn } from '~/app/shared/models/cd-table-column';
import { CdTableFetchDataContext } from '~/app/shared/models/cd-table-fetch-data-context';
import { CdTableSelection } from '~/app/shared/models/cd-table-selection';
import { CdDatePipe } from '~/app/shared/pipes/cd-date.pipe';
import { AuthStorageService } from '~/app/shared/services/auth-storage.service';
import { URLBuilderService } from '~/app/shared/services/url-builder.service';
import { ModalService } from '~/app/shared/services/modal.service';
import { TaskWrapperService } from '~/app/shared/services/task-wrapper.service';
import { FinishedTask } from '~/app/shared/models/finished-task';
import { NotificationService } from '~/app/shared/services/notification.service';

const BASE_URL = 'cephfs';

@Component({
  selector: 'cd-cephfs-list',
  templateUrl: './cephfs-list.component.html',
  styleUrls: ['./cephfs-list.component.scss'],
  providers: [{ provide: URLBuilderService, useValue: new URLBuilderService(BASE_URL) }]
})
export class CephfsListComponent extends ListWithDetails implements OnInit {
  columns: CdTableColumn[];
  filesystems: any = [];
  selection = new CdTableSelection();
  tableActions: CdTableAction[];
  permissions: Permissions;
  icons = Icons;
  monAllowPoolDelete = false;

  constructor(
    private authStorageService: AuthStorageService,
    private cephfsService: CephfsService,
    private cdDatePipe: CdDatePipe,
    public actionLabels: ActionLabelsI18n,
    private router: Router,
    private urlBuilder: URLBuilderService,
    private configurationService: ConfigurationService,
    private modalService: ModalService,
    private taskWrapper: TaskWrapperService,
    public notificationService: NotificationService
  ) {
    super();
    this.permissions = this.authStorageService.getPermissions();
  }

  ngOnInit() {
    this.columns = [
      {
        name: $localize`Name`,
        prop: 'mdsmap.fs_name',
        flexGrow: 2
      },
      {
        name: $localize`Created`,
        prop: 'mdsmap.created',
        flexGrow: 2,
        pipe: this.cdDatePipe
      },
      {
        name: $localize`Enabled`,
        prop: 'mdsmap.enabled',
        flexGrow: 1,
        cellTransformation: CellTemplate.checkIcon
      }
    ];
    this.tableActions = [
      {
        name: this.actionLabels.CREATE,
        permission: 'create',
        icon: Icons.add,
        click: () => this.router.navigate([this.urlBuilder.getCreate()]),
        canBePrimary: (selection: CdTableSelection) => !selection.hasSelection
      },
      {
        name: this.actionLabels.EDIT,
        permission: 'update',
        icon: Icons.edit,
        click: () => this.editAction()
      },
      {
        permission: 'delete',
        icon: Icons.destroy,
        click: () => this.removeVolumeModal(),
        name: this.actionLabels.REMOVE,
        disable: this.getDisableDesc.bind(this)
      }
    ];

    if (this.permissions.configOpt.read) {
      this.configurationService.get('mon_allow_pool_delete').subscribe((data: any) => {
        if (_.has(data, 'value')) {
          const monSection = _.find(data.value, (v) => {
            return v.section === 'mon';
          }) || { value: false };
          this.monAllowPoolDelete = monSection.value === 'true' ? true : false;
        }
      });
    }
  }

  loadFilesystems(context: CdTableFetchDataContext) {
    this.cephfsService.list().subscribe(
      (resp: any[]) => {
        this.filesystems = resp;
      },
      () => {
        context.error();
      }
    );
  }

  updateSelection(selection: CdTableSelection) {
    this.selection = selection;
  }

  removeVolumeModal() {
    const volName = this.selection.first().mdsmap['fs_name'];
    this.modalService.show(CriticalConfirmationModalComponent, {
      itemDescription: 'Volume',
      itemNames: [volName],
      actionDescription: 'remove',
      submitActionObservable: () =>
        this.taskWrapper.wrapTaskAroundCall({
          task: new FinishedTask('cephfs/remove', { volumeName: volName }),
          call: this.cephfsService.remove(volName)
        })
    });
  }

  getDisableDesc(): boolean | string {
    if (this.selection?.hasSelection) {
      if (!this.monAllowPoolDelete) {
        return $localize`Volume deletion is disabled by the mon_allow_pool_delete configuration setting.`;
      }

      return false;
    }

    return true;
  }

  editAction() {
    const selectedVolume = this.selection.first().mdsmap['fs_name'];

    this.modalService.show(FormModalComponent, {
      titleText: $localize`Edit Volume: ${selectedVolume}`,
      fields: [
        {
          type: 'text',
          name: 'volumeName',
          value: selectedVolume,
          label: $localize`Name`,
          required: true
        }
      ],
      submitButtonText: $localize`Edit Volume`,
      onSubmit: (values: any) => {
        this.cephfsService.rename(selectedVolume, values.volumeName).subscribe(() => {
          this.notificationService.show(
            NotificationType.success,
            $localize`Updated Volume '${selectedVolume}'`
          );
        });
      }
    });
  }
}
