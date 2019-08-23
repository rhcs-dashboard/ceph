import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'healthColor'
})
export class HealthColorPipe implements PipeTransform {
  transform(value: any): any {
    if (value === 'HEALTH_OK') {
      return { color: '#6ca100' };
    } else if (value === 'HEALTH_WARN') {
      return { color: '#f0ab00' };
    } else if (value === 'HEALTH_ERR') {
      return { color: '#c9190b' };
    } else {
      return null;
    }
  }
}
