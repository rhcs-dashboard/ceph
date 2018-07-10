import { Component, Input, ViewEncapsulation } from '@angular/core';

@Component({
  selector: 'cd-info-card',
  templateUrl: './info-card.component.html',
  styleUrls: ['./info-card.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class InfoCardComponent {
  @Input() title: string;
  @Input() link: string;
  @Input() cardClass = 'col-md-6';
  @Input() imageClass: string;
}
