import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormArray, FormControl, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { SmbService } from '~/app/shared/api/smb.service';
import { ActionLabelsI18n, URLVerbs } from '~/app/shared/constants/app.constants';
import { Icons } from '~/app/shared/enum/icons.enum';
import { CdForm } from '~/app/shared/forms/cd-form';
import { CdFormBuilder } from '~/app/shared/forms/cd-form-builder';
import { CdFormGroup } from '~/app/shared/forms/cd-form-group';
import { FinishedTask } from '~/app/shared/models/finished-task';
import { TaskWrapperService } from '~/app/shared/services/task-wrapper.service';
import { Group, SMBCluster, SMBUsersGroups, User, USERSGROUPS_RESOURCE } from '../smb.model';

@Component({
  selector: 'cd-smb-usersgroups-form',
  templateUrl: './smb-usersgroups-form.component.html',
  styleUrls: ['./smb-usersgroups-form.component.scss']
})
export class SmbUsersgroupsFormComponent extends CdForm implements OnInit {
  form: CdFormGroup;
  action: string;
  resource: string;
  editing: boolean;
  icons = Icons;

  smbClusters$: Observable<SMBCluster[]>;

  constructor(
    private actionLabels: ActionLabelsI18n,
    private taskWrapperService: TaskWrapperService,
    private formBuilder: CdFormBuilder,
    private smbService: SmbService,
    private router: Router,
    private cd: ChangeDetectorRef,
    private route: ActivatedRoute
  ) {
    super();
    this.editing = this.router.url.startsWith(`/cephfs/smb/usersgroups/${URLVerbs.EDIT}`);
    this.resource = $localize`Users Groups`;
  }

  ngOnInit() {
    this.action = this.actionLabels.CREATE;
    this.smbClusters$ = this.smbService.listClusters();
    this.createForm();

    if (this.editing) {
      let editingUsersGroupId: string;
      this.route.params.subscribe((params: { users_groups_id: string }) => {
        editingUsersGroupId = params.users_groups_id;
      });

      this.smbService.getUsersGroups(editingUsersGroupId).subscribe((usersGroups: SMBUsersGroups) => {
        this.form.get('users_groups_id').setValue(usersGroups.users_groups_id);
        this.form.get('linkedToCluster').setValue(usersGroups.linked_to_cluster);

        usersGroups.values.users.forEach((user: User) => {
          this.addUser(user);
        });

        usersGroups.values.groups.forEach((group: Group) => {
          this.addGroup(group);
        });
      });
    }
  }

  createForm() {
    this.form = this.formBuilder.group({
      usersGroupsId: new FormControl('', {
        validators: [Validators.required]
      }),
      linkedToCluster: new FormControl(null),
      users: new FormArray([
        this.formBuilder.group({
          name: ['', Validators.required],
          password: ['', [Validators.required]]
        })
      ]),
      groups: new FormArray([])
    });
  }

  submit() {
    const usersGroupsId = this.form.getValue('usersGroupsId');
    const linkedToCluster = this.form.getValue('linkedToCluster')
    const users = this.form.getValue('users');
    const groups = this.form.getValue('groups');
    const usersgroups: SMBUsersGroups = {
      resource_type: USERSGROUPS_RESOURCE,
      users_groups_id: usersGroupsId,
      values: { users: users, groups: groups },
      linked_to_cluster: linkedToCluster
    };

    const self = this;
    const BASE_URL = 'smb/usersgroups/'

    let taskUrl = `${BASE_URL}${this.editing ? URLVerbs.EDIT : URLVerbs.CREATE}`;
    this.taskWrapperService
      .wrapTaskAroundCall({
        task: new FinishedTask(taskUrl, {
          usersGroupsId: usersGroupsId
        }),
        call: this.smbService.createUsersgroups(usersgroups)
      })
      .subscribe({
        error() {
          self.form.setErrors({ cdSubmitButton: true });
        },
        complete: () => {
          this.router.navigate(['cephfs/smb']);
        }
      });
  }

  get users(): FormArray {
    return this.form.get('users') as FormArray;
  }

  get groups(): FormArray {
    return this.form.get('groups') as FormArray;
  }

  newUser(user?: User): CdFormGroup {
    return this.formBuilder.group({
      name: [user ? user.name : '', Validators.required],
      password: [user ? user.password : '', [Validators.required]]
    });
  }

  newGroup(group?: Group): CdFormGroup {
    return this.formBuilder.group({
      name: [group ? group.name : '']
    });
  }

  addUser(user?: User): void {
    this.users.push(this.newUser(user));
  }

  addGroup(group?: Group): void {
    this.groups.push(this.newGroup(group));
  }

  removeUser(index: number): void {
    this.users.removeAt(index);
    this.cd.detectChanges();
  }

  removeGroup(index: number): void {
    this.groups.removeAt(index);
    this.cd.detectChanges();
  }

}
