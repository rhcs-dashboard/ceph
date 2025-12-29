import { Component, OnDestroy, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin, of, Subject } from 'rxjs';
import { catchError, finalize, map, switchMap, takeUntil } from 'rxjs/operators';

import { ActionLabelsI18n, URLVerbs } from '~/app/shared/constants/app.constants';
import { CdTableSelection } from '~/app/shared/models/cd-table-selection';
import { NvmeofSubsystem, NvmeofSubsystemInitiator } from '~/app/shared/models/nvmeof';
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

interface SubsystemWithGroup {
  sub: NvmeofSubsystem;
  group: GatewayGroup;
}

@Component({
  selector: 'cd-nvmeof-subsystems',
  templateUrl: './nvmeof-subsystems.component.html',
  styleUrls: ['./nvmeof-subsystems.component.scss'],
  standalone: false
})
export class NvmeofSubsystemsComponent extends ListWithDetails implements OnInit, OnDestroy {
  @ViewChild('authenticationTpl', { static: true })
  authenticationTpl: TemplateRef<any>;

  @ViewChild('encryptionTpl', { static: true })
  encryptionTpl: TemplateRef<any>;

  subsystems: NvmeofSubsystem[] = [];
  subsystemsColumns: CdTableColumn[] = [];
  permissions: Permissions;
  selection = new CdTableSelection();
  tableActions: CdTableAction[];
  isLoading = false;

  private destroy$ = new Subject<void>();

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
    this.isLoading = true;
    this.nvmeofService
      .listGatewayGroups()
      .pipe(
        takeUntil(this.destroy$),
        map((gatewayGroups: GatewayGroup[][]) => gatewayGroups?.[0] ?? []),
        switchMap((groups: GatewayGroup[]) => {
          if (groups.length === 0) {
            return of([]);
          }
          return forkJoin(
            groups.map((group: GatewayGroup) =>
              this.nvmeofService.listSubsystems(group.spec?.group).pipe(
                catchError(() => of([])),
                map((subsystems: NvmeofSubsystem[] | NvmeofSubsystem) => {
                  const subsystemArray = Array.isArray(subsystems) ? subsystems : [subsystems];
                  return subsystemArray.map((sub) => ({ sub, group }));
                })
              )
            )
          ).pipe(map((results) => results.flat()));
        }),
        switchMap((subsystemsWithGroups: SubsystemWithGroup[]) => {
          if (subsystemsWithGroups.length === 0) {
            return of([]);
          }
          return forkJoin(
            subsystemsWithGroups.map(({ sub, group }) =>
              this.nvmeofService.getInitiators(sub.nqn, group.spec?.group).pipe(
                catchError(() => of([])),
                map((initiators: NvmeofSubsystemInitiator[]) => ({
                  ...sub,
                  gw_group: group.spec?.group,
                  initiator_count: Array.isArray(initiators) ? initiators.length : 0
                }))
              )
            )
          );
        }),
        catchError(() => of([])),
        finalize(() => (this.isLoading = false))
      )
      .subscribe((subsystems: NvmeofSubsystem[]) => {
        this.subsystems = subsystems;
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
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
