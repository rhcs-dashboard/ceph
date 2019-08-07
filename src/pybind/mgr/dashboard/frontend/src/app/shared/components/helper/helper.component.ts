import { Component, Input } from '@angular/core';

@Component({
  selector: 'cd-helper',
  templateUrl: './helper.component.html',
  styleUrls: ['./helper.component.scss']
})
export class HelperComponent {
  @Input()
  class: string;

  @Input()
  html: any;

  constructor() {}
}
