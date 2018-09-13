import { Component, OnInit, OnDestroy, Renderer } from '@angular/core';
import { Router } from '@angular/router';
import { DOCUMENT } from '@angular/platform-browser';

import { BsModalService } from 'ngx-bootstrap';

import { AuthService } from '../../../shared/api/auth.service';
import { Credentials } from '../../../shared/models/credentials';
import { AuthStorageService } from '../../../shared/services/auth-storage.service';

@Component({
  selector: 'cd-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit, OnDestroy {

  model = new Credentials();

  constructor(
    private authService: AuthService,
    private authStorageService: AuthStorageService,
    private renderer: Renderer,
    private bsModalService: BsModalService,
    private router: Router,
  ) {
    this.renderer.setElementClass(document.documentElement, 'login-pf', true);
  }

  ngOnInit() {
    if (this.authStorageService.isLoggedIn()) {
      this.router.navigate(['']);
    } else {
      // Make sure all open modal dialogs are closed. This might be
      // necessary when the logged in user is redirected to the login
      // page after a 401.
      const modalsCount = this.bsModalService.getModalsCount();
      for (let i = 1; i <= modalsCount; i++) {
        this.bsModalService.hide(i);
      }
    }
  }

  ngOnDestroy() {
    this.renderer.setElementClass(document.documentElement, 'login-pf', false);
  }

  login() {
    this.authService.login(this.model).then(() => {
      this.router.navigate(['']);
    });
  }
}
