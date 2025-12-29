import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

import { ActionLabelsI18n, URLVerbs } from '~/app/shared/constants/app.constants';
import { CdTableSelection } from '~/app/shared/models/cd-table-selection';
import { NvmeofSubsystem } from '~/app/shared/models/nvmeof';
import { Permissions } from '~/app/shared/models/permissions';
import { AuthStorageService } from '~/app/shared/services/auth-storage.service';
import { ListWithDetails } from '~/app/shared/classes/list-with-details.class';
import { CdTableAction } from '~/app/shared/models/cd-table-action';
import { CdTableColumn } from '~/app/shared/models/cd-table-column';
import { Icons } from '~/app/shared/enum/icons.enum';
import { DeleteConfirmationModalComponent } from '~/app/shared/components/delete-confirmation-modal/delete-confirmation-modal.component';
import { FinishedTask } from '~/app/shared/models/finished-task';
import { TaskWrapperService } from '~/app/shared/services/task-wrapper.service';
import { NvmeofService, GatewayGroup } from '~/app/shared/api/nvmeof.service';
import { ModalCdsService } from '~/app/shared/services/modal-cds.service';

const BASE_URL = 'block/nvmeof/subsystems';

@Component({
  selector: 'cd-nvmeof-subsystems',
  templateUrl: './nvmeof-subsystems.component.html',
  styleUrls: ['./nvmeof-subsystems.component.scss'],
  standalone: false
})
export class NvmeofSubsystemsComponent extends ListWithDetails implements OnInit {
  @ViewChild('authenticationTpl', { static: true })
  authenticationTpl: TemplateRef<any>;

  @ViewChild('encryptionTpl', { static: true })
  encryptionTpl: TemplateRef<any>;

  subsystems: NvmeofSubsystem[] = [];
  subsystemsColumns: CdTableColumn[] = [];
  permissions: Permissions;
  selection = new CdTableSelection();
  tableActions: CdTableAction[];

  constructor(
    private nvmeofService: NvmeofService,
    private authStorageService: AuthStorageService,
    public actionLabels: ActionLabelsI18n,
    private router: Router,
    private modalService: ModalCdsService,
    private taskWrapper: TaskWrapperService
  ) {
    super();
    this.permissions = this.authStorageService.getPermissions();
  }

  ngOnInit() {
    this.subsystemsColumns = [
      {
        name: $localize`Subsystem NQN`,
        prop: 'nqn',
        flexGrow: 2
      },
      {
        name: $localize`Initiators`,
        prop: 'initiator_count'
      },
      {
        name: $localize`Gateway group`,
        prop: 'gw_group'
      },
      {
        name: $localize`Namespaces`,
        prop: 'namespace_count'
      },
      {
        name: $localize`Authentication`,
        prop: 'authentication',
        cellTemplate: this.authenticationTpl
      },
      {
        name: $localize`Traffic encryption`,
        prop: 'encryption',
        cellTemplate: this.encryptionTpl
      }
    ];
    this.tableActions = [
      {
        name: this.actionLabels.CREATE,
        permission: 'create',
        icon: Icons.add,
        click: () => this.router.navigate([BASE_URL, { outlets: { modal: [URLVerbs.CREATE] } }]),
        canBePrimary: (selection: CdTableSelection) => !selection.hasSelection
      },
      {
        name: this.actionLabels.DELETE,
        permission: 'delete',
        icon: Icons.destroy,
        click: () => this.deleteSubsystemModal()
      }
    ];
  }

  updateSelection(selection: CdTableSelection) {
    this.selection = selection;
  }

  getSubsystems() {
    this.nvmeofService
      .listGatewayGroups()
      .pipe(
        switchMap((gatewayGroups: GatewayGroup[][]) => {
          const groups = gatewayGroups?.[0] ?? [];
          if (groups.length === 0) {
            return of([]);
          }
          return forkJoin(
            groups.map((group: GatewayGroup) =>
              this.nvmeofService.listSubsystems(group.spec?.group).pipe(
                catchError(() => of([])),
                switchMap((subsystems: NvmeofSubsystem[] | NvmeofSubsystem) => {
                  const subsystemArray = Array.isArray(subsystems) ? subsystems : [subsystems];
                  // For each subsystem, get initiators count
                  if (subsystemArray.length === 0) {
                    return of([]);
                  }
                  return forkJoin(
                    subsystemArray.map((sub: NvmeofSubsystem) =>
                      this.nvmeofService.getInitiators(sub.nqn, group.spec?.group).pipe(
                        catchError(() => of([])),
                        map((initiators: any) => ({
                          ...sub,
                          gw_group: group.spec?.group,
                          initiator_count: Array.isArray(initiators) ? initiators.length : 0
                        }))
                      )
                    )
                  );
                })
              )
            )
          ).pipe(map((results: any[][]) => results.flat()));
        })
      )
      .subscribe((subsystems: any[]) => {
        this.subsystems = subsystems;
      });
  }

  deleteSubsystemModal() {
    const subsystem = this.selection.first();
    this.modalService.show(DeleteConfirmationModalComponent, {
      itemDescription: 'Subsystem',
      itemNames: [subsystem.nqn],
      actionDescription: 'delete',
      submitActionObservable: () =>
        this.taskWrapper.wrapTaskAroundCall({
          task: new FinishedTask('nvmeof/subsystem/delete', { nqn: subsystem.nqn }),
          call: this.nvmeofService.deleteSubsystem(subsystem.nqn, subsystem.gw_group)
        })
    });
  }
}
