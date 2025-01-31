import { Buffer, NullBuffer } from "$lib/models/buffer.model";
import { NullPane, Pane, PaneSplit } from "$lib/models/pane.model";
import { componentMapping } from "./component-mapping.service";

export class PaneService {

    findBufferPane(key: string, pane: Pane | null): Pane {
		if (!pane || pane instanceof NullPane) {
			return new NullPane();
		}

		if (pane.split === PaneSplit.Null && pane.buffer.key === key) {
			return pane;
		}

		// recurse left panes
		let newPane = this.findBufferPane(key, pane.leftPane);

		if (!(newPane instanceof NullPane)) {
			return newPane;
		}

		// recurse right panes
		newPane = this.findBufferPane(key, pane.rightPane);

		if (!(newPane instanceof NullPane)) {
			return newPane;
		}

		return new NullPane();
	}
    
    splitPane(p: Pane, paneSplit: PaneSplit, componentName: any) {
        
        
        p.split = paneSplit;

        p.leftPane = new Pane();
        p.leftPane.buffer = p.buffer;
        p.leftPane.parentNode = p;
        p.leftPane.split = PaneSplit.Null;

        p.rightPane = new Pane();
        p.rightPane.buffer = new Buffer();
        p.rightPane.buffer.componentName = componentName
        p.rightPane.buffer.component = componentMapping.getComponent(componentName)
        p.rightPane.parentNode = p;
        p.rightPane.split = PaneSplit.Null;

        p.buffer = new NullBuffer();
        
    }

}

export let paneService = new PaneService();