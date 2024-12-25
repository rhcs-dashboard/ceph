import { Component, Input } from '@angular/core';
import { CdTableColumn } from '~/app/shared/models/cd-table-column';
import { SMBUsersGroups } from '../smb.model';

@Component({
  selector: 'cd-smb-usersgroups-details',
  templateUrl: './smb-usersgroups-details.component.html',
  styleUrls: ['./smb-usersgroups-details.component.scss']
})
export class SmbUsersgroupsDetailsComponent {
  @Input()
  selection: SMBUsersGroups;
  columns: CdTableColumn[];

  ngOnInit() {
    this.columns = [
      {
        name: $localize`Username`,
        prop: 'name',
        flexGrow: 2
      }
    ];
  }
}
