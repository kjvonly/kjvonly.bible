package annot_test

import (
	"fmt"

	"github.com/kjvonly/kjvonly.bible/app/domain/annotapp"
	"github.com/kjvonly/kjvonly.bible/business/domain/annotbus"
)

func toAppAnnotss(bus annotbus.Annots) annotapp.Annots {
	app := make(map[int]map[int]annotapp.WordAnnots)

	for k1, v1 := range bus {
		for k2, v2 := range v1 {
			_, ok := app[k1]
			if !ok {
				app[k1] = make(map[int]annotapp.WordAnnots)
			}

			app[k1][k2] = annotapp.WordAnnots{
				Class: v2.Class,
			}
		}
	}

	return app
}

func toAppAnnot(ant annotbus.Annot) annotapp.Annot {
	return annotapp.Annot{
		UserID:          ant.UserID.String(),
		ReferenceVector: fmt.Sprintf("%d_%d", ant.BookID, ant.Chapter),
		Annots:          toAppAnnotss(ant.Annots),
		Version:         ant.Version,
		DateCreated:     ant.DateCreated.Unix(),
		DateUpdated:     ant.DateUpdated.Unix(),
	}
}

func toAppAnnots(annots []annotbus.Annot) []annotapp.Annot {
	items := make([]annotapp.Annot, len(annots))
	for i, ant := range annots {
		items[i] = toAppAnnot(ant)
	}

	return items
}

func toAppAnnotPtr(ant annotbus.Annot) *annotapp.Annot {
	appNte := toAppAnnot(ant)
	return &appNte
}
