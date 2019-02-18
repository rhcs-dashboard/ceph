import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'cd-error',
  templateUrl: './error.component.html',
  styleUrls: ['./error.component.scss']
})
export class ErrorComponent implements OnInit {
  errorHeading: string;
  errordesc: string;
  path: string;
  constructor(private router: Router) {}

  ngOnInit() {
    this.path = this.router.url;
    if (this.path === '/404') {
      this.errorHeading = 'Page Not Found';
      this.errordesc = `Sorry, we couldn’t find what you were looking for.
      The page you requested may have been changed or moved.`;
    } else if (this.path === '/403') {
      this.errorHeading = 'Access Denied';
      this.errordesc = `Sorry, you don’t have permission to view this page
      or resource.`;
    }
  }

  dashboard() {
    this.router.navigateByUrl('/dashboard');
  }
}
