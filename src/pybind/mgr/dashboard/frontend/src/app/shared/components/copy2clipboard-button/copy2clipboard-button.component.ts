import { Component, Input , ElementRef, HostListener, Renderer2 } from '@angular/core';

import { ActionLabelsI18n } from '../../constants/app.constants';
import { Icons } from '../../enum/icons.enum';

import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'cdCopy2ClipboardButton',
  templateUrl: './copy2clipboard-button.component.html',
  styleUrls: ['./copy2clipboard-button.component.scss']
})
export class Copy2ClipboardButtonComponent {
  @Input()
  private source: string;

  icons = Icons;

  constructor(
    private toastr: ToastrService,
    private actionLabels: ActionLabelsI18n
  ) {}

  private getInputElement() {
    return document.getElementById(this.source) as HTMLInputElement;
  }

  @HostListener('click')
  onClick() {
    try {
      // Create the input to hold our text.
      const tmpInputElement = document.createElement('input');
      tmpInputElement.value = this.getInputElement().value;
      document.body.appendChild(tmpInputElement);
      // Copy text to clipboard.
      tmpInputElement.select();
      document.execCommand('copy');
      // Finally remove the element.
      document.body.removeChild(tmpInputElement);

      this.toastr.success('Copied text to the clipboard successfully.');
    } catch (err) {
      this.toastr.error('Failed to copy text to the clipboard.');
    }
  }
}
