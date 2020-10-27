import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';

import { configureTestBed, i18nProviders } from '../../../../testing/unit-test-helper';
import { Copy2ClipboardButtonComponent } from './copy2clipboard-button.component';

describe('Copy2ClipboardButtonComponent', () => {
  let component: Copy2ClipboardButtonComponent;
  let fixture: ComponentFixture<Copy2ClipboardButtonComponent>;

  configureTestBed({
    imports: [RouterTestingModule],
    declarations: [Copy2ClipboardButtonComponent],
    providers: [i18nProviders]
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(Copy2ClipboardButtonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
