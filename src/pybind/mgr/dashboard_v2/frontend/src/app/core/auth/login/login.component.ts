import { Component, OnInit, ViewContainerRef, OnDestroy, Renderer } from '@angular/core';
import { Router } from '@angular/router';
import { DOCUMENT } from '@angular/platform-browser';

import { ToastsManager } from 'ng2-toastr';

import { Credentials } from '../../../shared/models/credentials';
import { AuthStorageService } from '../../../shared/services/auth-storage.service';
import { AuthService } from '../../../shared/services/auth.service';

@Component({
  selector: 'cd-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit, OnDestroy {

  model = new Credentials();

  constructor(private authService: AuthService,
    private authStorageService: AuthStorageService,
    private renderer: Renderer,
    private router: Router,
    public toastr: ToastsManager,
    private vcr: ViewContainerRef) {
    this.toastr.setRootViewContainerRef(vcr);
    this.renderer.setElementClass(document.documentElement, 'login-pf', true);
  }

  ngOnInit() {
    if (this.authStorageService.isLoggedIn()) {
      this.router.navigate(['']);
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
