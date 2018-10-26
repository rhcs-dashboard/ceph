import { Component, OnInit } from '@angular/core';
import { detect } from 'detect-browser';
import { BsModalRef } from 'ngx-bootstrap/modal';

import { AppConstants } from '../../../shared/constants/app.constants';
import { Permission } from '../../../shared/models/permissions';

import { UserService } from '../../../shared/api/user.service';
import { AuthStorageService } from '../../../shared/services/auth-storage.service';

@Component({
  selector: 'cd-about',
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.scss']
})
export class AboutComponent implements OnInit {
  modalVariables: any;
  productConstants: any;
  userPermission: Permission;

  constructor(
    public modalRef: BsModalRef,
    private userService: UserService,
    private authStorageService: AuthStorageService
  ) {
    this.userPermission = this.authStorageService.getPermissions().user;
  }

  ngOnInit() {
    this.productConstants = AppConstants;
    this.modalVariables = this.setVariables();
  }

  setVariables() {
    const product = {} as any;
    product.hostAddr = window.location.hostname;
    product.user = localStorage.getItem('dashboard_username');
    product.role = 'user';
    if (this.userPermission.read) {
      this.userService.get(product.user).subscribe((data: any) => {
        product.role = data.roles;
      });
    }
    const browser = detect();
    product.browserName = browser && browser.name ? browser.name : 'Not detected';
    product.browserVersion = browser && browser.version ? browser.version : 'Not detected';
    product.browserOS = browser && browser.os ? browser.os : 'Not detected';

    return product;
  }
}
