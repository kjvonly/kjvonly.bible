import { annotsService } from '$lib/services/bible/annots.service';
import { notesService } from '../notes.service';
import { toastService } from '../toast.service';
import { deepMergeService } from './deepMerge.service';

/**
 * Allow users to import their data
 */
export class ImporterService {
  doImport(e: any) {
    const reader = new FileReader();
    reader.onload = (e2) => {
      let result: any = e2?.target?.result;
      (async () => {
        try {
          toastService.showToast('starting import data');
          let newAnnotations = JSON.parse(result);
          let annotations = await annotsService.getAllAnnotations();

          if (!annotations) {
            annotations = {};
          }
          let annotationsMap: any = {};

          annotations.forEach((a: any) => {
            annotationsMap[a.id] = a;
          });

          let newAnnotationsMap: any = {};

          newAnnotations.forEach((a: any) => {
            newAnnotationsMap[a.id] = a;
          });

          // order of params mater, (target, source) source will update target.
          //const merged = mergeDeep(annotationsMap, newAnnotations);
          const merged = deepMergeService.deepMerge(
            annotationsMap,
            newAnnotationsMap,
            {
              arrays: 'replace'
            }
          );
          let mergedList: any[] = [];
          Object.keys(merged).forEach((k) => {
            mergedList.push(merged[k]);
          });

          await annotsService.putAllAnnotations(mergedList);
          notesService.init();
          document.getElementById('kjvonly-import')?.remove();
          toastService.showToast('finished import data');
        } catch (ex) {
          console.log(`error importing file ${e.target.files[0]}`, ex);
          document.getElementById('kjvonly-import')?.remove();
        }
      })();
    };
    reader.readAsText(e.target.files[0]);
  }

  async import() {
    var element = document.createElement('input');
    element.setAttribute('id', 'kjvonly-import');
    element.setAttribute('type', 'file');
    element.setAttribute('accept', '.json');
    element.onchange = this.doImport;

    element.style.display = 'none';
    document.body.appendChild(element);

    element.click();
  }
}

export const importerService = new ImporterService();
