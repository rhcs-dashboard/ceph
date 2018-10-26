import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { detect } from 'detect-browser';
import { BsModalRef } from 'ngx-bootstrap/modal';

import { configureTestBed } from '../../../../testing/unit-test-helper';
import { SharedModule } from '../../../shared/shared.module';
import { AboutComponent } from './about.component';

describe('AboutComponent', () => {
  let component: AboutComponent;
  let fixture: ComponentFixture<AboutComponent>;

  configureTestBed({
    imports: [SharedModule, HttpClientTestingModule],
    declarations: [AboutComponent],
    providers: [BsModalRef, detect]
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AboutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
