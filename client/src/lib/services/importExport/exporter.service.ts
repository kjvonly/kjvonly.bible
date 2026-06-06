import { annotsService } from '$lib/services/bible/annots.service';
import { toastService } from '../toast.service';

/**
 * Allow user to export their data
 */
export class ExporterService {
  async export() {
    toastService.showToast('starting export data');
    let data = await annotsService.getAllAnnotations();

    var element = document.createElement('a');
    element.setAttribute(
      'href',
      'data:application/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify(data))
    );
    element.setAttribute('download', 'annotations');

    element.style.display = 'none';
    document.body.appendChild(element);

    element.click();

    document.body.removeChild(element);
    toastService.showToast('finished export data');
  }
}

export const exporterService = new ExporterService();
