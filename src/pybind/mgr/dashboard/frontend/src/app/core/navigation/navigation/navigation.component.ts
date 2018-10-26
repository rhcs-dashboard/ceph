import { Component, OnInit } from '@angular/core';

import { AppConstants } from '../../../shared/constants/app.constants';
import { Permissions } from '../../../shared/models/permissions';
import { AuthStorageService } from '../../../shared/services/auth-storage.service';
import { SummaryService } from '../../../shared/services/summary.service';

@Component({
  selector: 'cd-navigation',
  templateUrl: './navigation.component.html',
  styleUrls: ['./navigation.component.scss']
})
export class NavigationComponent implements OnInit {
  permissions: Permissions;
  summaryData: any;
  isCollapsed = true;
  productName: any;

  constructor(
    private authStorageService: AuthStorageService,
    private summaryService: SummaryService
  ) {
    this.permissions = this.authStorageService.getPermissions();
  }

  ngOnInit() {
    this.summaryService.subscribe((data: any) => {
      if (!data) {
        return;
      }
      this.summaryData = data;
    });
    this.productName = AppConstants.productName;
  }

  blockHealthColor() {
    if (this.summaryData && this.summaryData.rbd_mirroring) {
      if (this.summaryData.rbd_mirroring.errors > 0) {
        return { color: '#d9534f' };
      } else if (this.summaryData.rbd_mirroring.warnings > 0) {
        return { color: '#f0ad4e' };
      }
    }
  }
}
