function slugify(text) {
    const slug_exceptions = {
        "Cherry Magic! Thirty Years of Virginity Can Make You a Wizard?!": "cherry-magic",
        "Komi Can't Communicate": "komi-can-t-communicate",
        "Heterogenia Linguistico: An Introduction to Interspecies Linguistics": "heterogenia-linguistico",
        "Ranma 1/2": "ranma-1-2",
        "Tamon's B-Side": "tamon-s-b-side",
        "Boys Over Flowers: Hana Yori Dango": "boys-over-flowers"
    }
    if (text in slug_exceptions) {
        return slug_exceptions[text]
    }
    let repl = text
    .toString()
    .normalize('NFD') // Normalize Unicode characters to their decomposed form
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics (accents)
    .toLowerCase() // Convert to lowercase
    .trim() // Trim leading/trailing whitespace
    .replace(/[^a-z0-9 -]/g, '') // Replace non-alphanumeric characters with empty string
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-'); // Replace multiple hyphens with a single hyphen
    return repl
}
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

class Root extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            categories: this.props.data.categories,
            series: this.props.data.series,
            selected: null,
            upcoming: []
        };
        this.update = this.update.bind(this);
        this.delete = this.delete.bind(this);
        this.download = this.download.bind(this);
        this.upload = this.upload.bind(this);
        this.getUpcoming = this.getUpcoming.bind(this);
        this.getUpcoming();
    }
    update() {
        const form = document.getElementById("form");
        const formData = new FormData(form);
        console.log(formData);
        const updated = {
            title: {en: formData.get("title-en"), int: formData.get("title-int")},
            staff: {author: formData.get("author"), artist: formData.get("artist"), translator: formData.get("translator")},
            volumes: formData.get("volumes"),
            publisher: formData.get("publisher"),
            tags: formData.get("tags").split(/,\s*/).filter((tag) => tag.length > 0),
            read: {volumes: formData.get("read-vol"), chapters: formData.get("read-chap")}
        };
        if (this.state.selected == -1) {
            this.setState({
                    series: [...this.state.series, updated],
                    selected: this.state.series.length
            }, () => {localStorage.setItem("data", JSON.stringify(this.state))});
        }
        else {
            this.setState({
                    series: this.state.series.map((manga, index) => index == this.state.selected ? updated : manga)
            }, () => {localStorage.setItem("data", JSON.stringify(this.state))});
        }
    }
    delete() {
        this.setState({
                series: this.state.series.filter((manga, index) => index != this.state.selected),
                selected: null
        }, () => {localStorage.setItem("data", JSON.stringify(this.state))});
    }
    download() {
        const data = localStorage.getItem('data');
        if (data) {
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'yam-manga-data.json';
            a.click();
            URL.revokeObjectURL(url);
        }
    }
    upload(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    this.setState({categories: data.categories, series: data.series})
                    localStorage.setItem('data', JSON.stringify(data));
                } catch (error) {
                    alert('Error parsing JSON:', error);
                }
            };
            reader.readAsText(file);
        }
    }
    async getUpcoming() {
        let upcoming = [];
        const reading = this.state.series.filter((manga) => manga.tags.includes("reading"))
        for (const manga of reading) {
            const slug = slugify(manga.title.en);
            try {
                if (manga.publisher == "VIZ Media") {
                    const vol_slug = `volume-${parseInt(manga.read.volumes) + 1}`;
                    try {
                        let response = await fetch(`https://api.allorigins.win/get?url=https%3A%2F%2Fwww.viz.com%2F${slug}`);
                        let json = await response.json();
                        let html = json.contents;
                        let doc = this.parseHTML(html);
                        let seeAll = doc.querySelector('[aria-label="see all manga products"]');
                        if (seeAll) {
                            let response = await fetch(`https://api.allorigins.win/get?url=https%3A%2F%2Fwww.viz.com${seeAll.pathname}`);
                            json = await response.json();
                            html = json.contents;
                            doc = this.parseHTML(html);
                            seeAll = [...doc.querySelectorAll('.shelf-wrapper a')].filter((a) => a.text.includes("See all"));
                            if (seeAll.length > 0) {
                                seeAll = seeAll[0];
                                response = await fetch(`https://api.allorigins.win/get?url=https%3A%2F%2Fwww.viz.com${seeAll.pathname}`);
                                json = await response.json();
                                html = json.contents;
                                doc = this.parseHTML(html);
                                const volumes = [...doc.querySelectorAll('.shelf article div a[href]')];
                                const vol_find = volumes.filter((vol) => vol.pathname.includes(vol_slug));
                                if (vol_find.length > 0) {
                                    const vol = vol_find[0];
                                    let response = await fetch(`https://api.allorigins.win/get?url=https%3A%2F%2Fwww.viz.com${vol.pathname}`);
                                    json = await response.json();
                                    html = json.contents;
                                    doc = this.parseHTML(html);
                                    let release = doc.querySelector('.o_release-date').innerHTML;
                                    release = release.slice(release.indexOf("</strong>") + 9).trim();
                                    upcoming.push({title: manga.title.en, volume: parseInt(manga.read.volumes) + 1, release: new Date(Date.parse(release))});
                                }
                                else {
                                    if (volumes.length == 0) {
                                        upcoming.push({title: manga.title.en, volume: null, release: null});
                                    }
                                }
                            }
                            else {
                                const volumes = [...doc.querySelectorAll('.shelf article div a[href]')];
                                const vol_find = volumes.filter((vol) => vol.pathname.includes(vol_slug));
                                if (vol_find.length > 0) {
                                    const vol = vol_find[0];
                                    let response = await fetch(`https://api.allorigins.win/get?url=https%3A%2F%2Fwww.viz.com${vol.pathname}`);
                                    json = await response.json();
                                    html = json.contents;
                                    doc = this.parseHTML(html);
                                    let release = doc.querySelector('.o_release-date').innerHTML;
                                    release = release.slice(release.indexOf("</strong>") + 9).trim();
                                    upcoming.push({title: manga.title.en, volume: parseInt(manga.read.volumes) + 1, release: new Date(Date.parse(release))});
                                }
                                else {
                                    if (volumes.length == 0) {
                                        upcoming.push({title: manga.title.en, volume: null, release: null});
                                    }
                                }
                            }
                        }
                        else {
                            const volumes = [...doc.querySelectorAll('.section_manga a.product-thumb')].sort((a, b) => parseInt(a.pathname.slice(a.pathname.lastIndexOf("/") + 1)) - parseInt(b.pathname.slice(b.pathname.lastIndexOf("/") + 1)));
                            const vol_find = volumes.filter((vol) => vol.pathname.includes(vol_slug));
                            if (vol_find.length > 0) {
                                const vol = vol_find[0];
                                let response = await fetch(`https://api.allorigins.win/get?url=https%3A%2F%2Fwww.viz.com${vol.pathname}`);
                                json = await response.json();
                                html = json.contents;
                                doc = this.parseHTML(html);
                                let release = doc.querySelector('.o_release-date').innerHTML;
                                release = release.slice(release.indexOf("</strong>") + 9).trim();
                                upcoming.push({title: manga.title.en, volume: parseInt(manga.read.volumes) + 1, release: new Date(Date.parse(release))});
                            }
                            else {
                                if (volumes.length == 0) {
                                    upcoming.push({title: manga.title.en, volume: null, release: null});
                                }
                            }
                        }
                    }
                    catch(err) {
                        let response = await fetch(`https://corsproxy.io/?https%3A%2F%2Fwww.viz.com%2F${slug}`);
                        let html = await response.text();
                        let doc = this.parseHTML(html);
                        let seeAll = doc.querySelector('[aria-label="see all manga products"]');
                        if (seeAll) {
                            let response = await fetch(`https://corsproxy.io/?https%3A%2F%2Fwww.viz.com${seeAll.pathname}`);
                            html = await response.text();
                            doc = this.parseHTML(html);
                            seeAll = [...doc.querySelectorAll('.shelf-wrapper a')].filter((a) => a.text.includes("See all"));
                            if (seeAll.length > 0) {
                                seeAll = seeAll[0];
                                response = await fetch(`https://corsproxy.io/?https%3A%2F%2Fwww.viz.com${seeAll.pathname}`);
                                html = await response.text();
                                doc = this.parseHTML(html);
                                const volumes = [...doc.querySelectorAll('.shelf article div a[href]')];
                                const vol_find = volumes.filter((vol) => vol.pathname.includes(vol_slug));
                                if (vol_find.length > 0) {
                                    const vol = vol_find[0];
                                    let response = await fetch(`https://corsproxy.io/?https%3A%2F%2Fwww.viz.com${vol.pathname}`);
                                    html = await response.text();
                                    doc = this.parseHTML(html);
                                    let release = doc.querySelector('.o_release-date').innerHTML;
                                    release = release.slice(release.indexOf("</strong>") + 9).trim();
                                    upcoming.push({title: manga.title.en, volume: parseInt(manga.read.volumes) + 1, release: new Date(Date.parse(release))});
                                }
                                else {
                                    if (volumes.length == 0) {
                                        upcoming.push({title: manga.title.en, volume: null, release: null});
                                    }
                                }
                            }
                        }
                        else {
                            const volumes = [...doc.querySelectorAll('.section_manga a.product-thumb')].sort((a, b) => parseInt(a.pathname.slice(a.pathname.lastIndexOf("/") + 1)) - parseInt(b.pathname.slice(b.pathname.lastIndexOf("/") + 1)));
                            const vol_find = volumes.filter((vol) => vol.pathname.includes(vol_slug));
                            if (vol_find.length > 0) {
                                const vol = vol_find[0];
                                let response = await fetch(`https://corsproxy.io/?https%3A%2F%2Fwww.viz.com${vol.pathname}`);
                                html = await response.text();
                                doc = this.parseHTML(html);
                                let release = doc.querySelector('.o_release-date').innerHTML;
                                release = release.slice(release.indexOf("</strong>") + 9).trim();
                                upcoming.push({title: manga.title.en, volume: parseInt(manga.read.volumes) + 1, release: new Date(Date.parse(release))});
                            }
                            else {
                                if (volumes.length == 0) {
                                    upcoming.push({title: manga.title.en, volume: null, release: null});
                                }
                            }
                        }
                    }
                }
                else if (manga.publisher == "Yen Press") {
                    try {
                        let response = await fetch(`https://api.allorigins.win/get?url=https%3A%2F%2Fyenpress.com%2Fseries%2F${slugify(manga.title.en)}`);
                        let json = await response.json();
                        let html = json.contents;
                        let doc = this.parseHTML(html);
                        const volumes = [...doc.querySelectorAll('#volumes-list div a[href]')];
                        if (volumes.length > manga.read.volumes) {
                            const vol = volumes[volumes.length - manga.read.volumes - 1];
                            let response = await fetch(`https://api.allorigins.win/get?url=https%3A%2F%2Fyenpress.com${vol.pathname}`);
                            json = await response.json();
                            html = json.contents;
                            doc = this.parseHTML(html);
                            let release = doc.querySelectorAll('.info')[4].innerHTML;
                            upcoming.push({title: manga.title.en, volume: parseInt(manga.read.volumes) + 1, release: new Date(Date.parse(release))});
                        }
                        else {
                            if (volumes.length == 0) {
                                upcoming.push({title: manga.title.en, volume: null, release: null});
                            }
                        }
                    }
                    catch {
                        let response = await fetch(`https://corsproxy.io/?https%3A%2F%2Fyenpress.com%2Fseries%2F${slugify(manga.title.en)}`);
                        let html = await response.text();
                        let doc = this.parseHTML(html);
                        const volumes = [...doc.querySelectorAll('#volumes-list div a[href]')];
                        if (volumes.length > manga.read.volumes) {
                            const vol = volumes[volumes.length - manga.read.volumes - 1];
                            let response = await fetch(`https://corsproxy.io/?https%3A%2F%2Fyenpress.com${vol.pathname}`);
                            html = await response.text();
                            doc = this.parseHTML(html);
                            let release = doc.querySelectorAll('.info')[4].innerHTML;
                            upcoming.push({title: manga.title.en, volume: parseInt(manga.read.volumes) + 1, release: new Date(Date.parse(release))});
                        }
                        else {
                            if (volumes.length == 0) {
                                upcoming.push({title: manga.title.en, volume: null, release: null});
                            }
                        }
                    }
                }
                else if (manga.publisher == "Kodansha") {
                    try {
                        let response = await fetch(`https://api.allorigins.win/get?url=https%3A%2F%2Fapi.kodansha.us%2Fseries%2FV2%2F${slugify(manga.title.en)}`);
                        let json = await response.json();
                        json = JSON.parse(json.contents);
                        let id = json.response.id;
                        response = await fetch(`https://api.allorigins.win/get?url=https%3A%2F%2Fapi.kodansha.us%2Fproduct%2FforSeries%2F${id}?platform=web?api-version=1.4`);
                        json = await response.json();
                        json = JSON.parse(json.contents);
                        if (json.length > manga.read.volumes) {
                            let release = json[manga.read.volumes].publishDate;
                            upcoming.push({title: manga.title.en, volume: parseInt(manga.read.volumes) + 1, release: new Date(Date.parse(release))});
                        }
                    }
                    catch {
                        let response = await fetch(`https://corsproxy.io/?https%3A%2F%2Fapi.kodansha.us%2Fseries%2FV2%2F${slugify(manga.title.en)}`);
                        let json = await response.json();
                        let id = json.response.id;
                        response = await fetch(`https://corsproxy.io/?https%3A%2F%2Fapi.kodansha.us%2Fproduct%2FforSeries%2F${id}?platform=web?api-version=1.4`);
                        json = await response.json();
                        if (json.length > manga.read.volumes) {
                            let release = json[manga.read.volumes].publishDate;
                            upcoming.push({title: manga.title.en, volume: parseInt(manga.read.volumes) + 1, release: new Date(Date.parse(release))});
                        }
                    }
                }
                else if (manga.publisher == "Seven Seas") {
                    try {
                        let response = await fetch(`https://api.allorigins.win/get?url=https%3A%2F%2Fsevenseasentertainment.com%2Fseries%2F${slugify(manga.title.en)}`);
                        let json = await response.json();
                        let html = json.contents;
                        let doc = this.parseHTML(html);
                        const volumes = [...doc.querySelectorAll('.volumes-container .series-volume')];
                        if (volumes.length > manga.read.volumes) {
                            const vol = volumes[manga.read.volumes];
                            let release = vol.text;
                            release = release.slice(release.indexOf("Release Date:") + 12, release.indexOf("Price:")).trim();
                            upcoming.push({title: manga.title.en, volume: parseInt(manga.read.volumes) + 1, release: new Date(Date.parse(release))});
                        }
                        else {
                            if (volumes.length == 0) {
                                upcoming.push({title: manga.title.en, volume: null, release: null});
                            }
                        }
                    }
                    catch {
                        let response = await fetch(`https://corsproxy.io/?url=https%3A%2F%2Fsevenseasentertainment.com%2Fseries%2F${slugify(manga.title.en)}`);
                        let html = await response.text();
                        let doc = this.parseHTML(html);
                        const volumes = [...doc.querySelectorAll('.volumes-container .series-volume')];
                        if (volumes.length > manga.read.volumes) {
                            const vol = volumes[manga.read.volumes];
                            let release = vol.text;
                            release = release.slice(release.indexOf("Release Date:") + 12, release.indexOf("Price:")).trim();
                            upcoming.push({title: manga.title.en, volume: parseInt(manga.read.volumes) + 1, release: new Date(Date.parse(release))});
                        }
                        else {
                            if (volumes.length == 0) {
                                upcoming.push({title: manga.title.en, volume: null, release: null});
                            }
                        }
                    }
                }
                else if (manga.publisher == "Square Enix") {
                    try {
                        let response = await fetch(`https://api.allorigins.win/get?url=https://squareenixmangaandbooks.square-enix-games.com/en-us/series/${slugify(manga.title.en)}`);
                        let json = await response.json();
                        let html = json.contents;
                        let doc = this.parseHTML(html);
                        const volumes = [...doc.querySelectorAll('a.group.text-black')];
                        const vol_find = volumes.filter((vol) => vol.text.includes(`Volume ${parseInt(manga.read.volumes) + 1}`));
                        if (vol_find.length > 0) {
                            const vol = vol_find[0];
                            let response = await fetch(`https://api.allorigins.win/get?url=https://squareenixmangaandbooks.square-enix-games.com${vol.pathname}`);
                            json = await response.json();
                            html = json.contents;
                            doc = this.parseHTML(html);
                            let release = doc.querySelector(".mx-1").innerHTML;
                            upcoming.push({title: manga.title.en, volume: parseInt(manga.read.volumes) + 1, release: new Date(Date.parse(release))});
                        }
                        else {
                            if (volumes.length == 0) {
                                upcoming.push({title: manga.title.en, volume: null, release: null});
                            }
                        }
                    }
                    catch {
                        let response = await fetch(`https://corsproxy.io/?https://squareenixmangaandbooks.square-enix-games.com/en-us/series/${slugify(manga.title.en)}`);
                        let html = await response.text();
                        let doc = this.parseHTML(html);
                        const volumes = [...doc.querySelectorAll('a.group.text-black')];
                        const vol_find = volumes.filter((vol) => vol.text.includes(`Volume ${parseInt(manga.read.volumes) + 1}`));
                        if (vol_find.length > 0) {
                            const vol = vol_find[0];
                            let response = await fetch(`https://corsproxy.io/?https://squareenixmangaandbooks.square-enix-games.com${vol.pathname}`);
                            html = await response.text();
                            doc = this.parseHTML(html);
                            let release = doc.querySelector(".mx-1").innerHTML;
                            upcoming.push({title: manga.title.en, volume: parseInt(manga.read.volumes) + 1, release: new Date(Date.parse(release))});
                        }
                        else {
                            if (volumes.length == 0) {
                                upcoming.push({title: manga.title.en, volume: null, release: null});
                            }
                        }
                    }
                }
                else {
                    upcoming.push({title: manga.title.en, volume: null, release: null});
                }
                this.setState({upcoming: upcoming});
            }
            catch(err) {
                console.log(manga.title, err);
                upcoming.push({title: manga.title.en, volume: null, release: null});
                this.setState({upcoming: upcoming});
            }
            await sleep(100);
        }
    }
    parseHTML(htmlString) {
        const parser = new DOMParser();
        return parser.parseFromString(htmlString, 'text/html');
    }
    sortAlphabetical(array) {
        return array.sort((a, b) => {return a.title.en.localeCompare(b.title.en)})
    }
    render() {
        return(
            <div>
                <div id="list">
                    <div id="new-series" className="series" onClick={() => {this.setState({selected: -1})}}><h6>+ new series</h6></div>
                    <div id="edit-categories" className="series" onClick={() => {let categories = prompt("Edit Categories:", this.state.categories.join(", ")); this.setState({categories: categories.split(/,\s*/).filter((category) => category.length > 0)}, () => localStorage.setItem("data", JSON.stringify(this.state)))}}><h6>edit categories</h6></div>
                    <div>
                        <input id="upload" type="file" onChange={this.upload}></input>
                        <button id="download" onClick={this.download}>Download</button>
                    </div>
                    <hr></hr>
                    [tag "reading" to track, ~0.5s/title]
                    <details>
                        <summary>upcoming volumes</summary>
                        <ul>
                            {this.state.upcoming.filter((manga) => manga.release && manga.release > new Date()).sort((a, b) => a.release - b.release).map((manga, index) => {
                                return (
                                    <li>{manga.title} {manga.volume} - {manga.release.toLocaleDateString()}</li>
                                )
                            })}
                        </ul>
                    </details>
                    <details>
                        <summary>backlog</summary>
                        <ul>
                            {this.state.upcoming.filter((manga) => manga.release && manga.release <= new Date()).sort((a, b) => a.release - b.release).map((manga, index) => {
                                return (
                                    <li>{manga.title} {manga.volume} - {manga.release.toLocaleDateString()}</li>
                                )
                            })}
                        </ul>
                    </details>
                    <details>
                        <summary>can't track</summary>
                        <ul>
                            {this.state.upcoming.filter((manga) => manga.release == null).sort((a, b) => a.title.localeCompare(b.title)).map((manga, index) => {
                                return (
                                    <li>{manga.title}</li>
                                )
                            })}
                        </ul>
                    </details>
                    <hr></hr>
                    {
                        this.state.categories.map((category, index) => {
                            return(
                                <details>
                                    <summary>{category}</summary>
                                    {this.sortAlphabetical(this.state.series.filter((manga) => manga.tags.includes(category))).map((manga, index) => {
                                        return (
                                            <div className="series" onClick={() => {this.setState({selected: this.state.series.indexOf(manga)})}}><h6>{manga.title.en}</h6></div>
                                        )
                                    })}
                                </details>
                            )
                        })
                    }
                    <details>
                        <summary>other</summary>
                        {this.sortAlphabetical(this.state.series.filter((manga) => this.state.categories.every((category) => !manga.tags.includes(category) && category != "reading"))).map((manga, index) => {
                            return (
                                <div className="series" onClick={() => {this.setState({selected: this.state.series.indexOf(manga)})}}><h6>{manga.title.en}</h6></div>
                            )
                        })}
                    </details>
                    <h6><a href="https://github.com/ravidosa" target="_blank">more by me</a></h6>
                </div>
                {this.state.selected != null &&
                <div id="select">
                    <form id="form"  key={this.state.selected}>
                        <label for="select-title-en">Title (EN)</label>
                        <input id="select-title-en" name="title-en" placeholder="Title (EN)" type="text" defaultValue={this.state.selected != -1 ? this.state.series[this.state.selected].title.en : ""}></input>

                        <label for="select-title-int">Title (INT)</label>
                        <input id="select-title-int" name="title-int" placeholder="Title (INT)" type="text" defaultValue={this.state.selected != -1 ? this.state.series[this.state.selected].title.int : ""}></input>

                        <hr></hr>
                        <label for="select-author">Author</label>
                        <input id="select-author" name="author" placeholder="Author" type="text" defaultValue={this.state.selected != -1 ? this.state.series[this.state.selected].staff.author : ""}></input>

                        <label for="select-artist">Artist</label>
                        <input id="select-artist" name="artist" placeholder="Artist" type="text" defaultValue={this.state.selected != -1 ? this.state.series[this.state.selected].staff.artist : ""}></input>

                        <label for="select-translator">Translator</label>
                        <input id="select-translator" name="translator" placeholder="Translator" type="text" defaultValue={this.state.selected != -1 ? this.state.series[this.state.selected].staff.translator : ""}></input>

                        <hr></hr>
                        <label for="select-volumes">Volumes</label>
                        <input id="select-volumes" name="volumes" placeholder="0" type="number" defaultValue={this.state.selected != -1 ? this.state.series[this.state.selected].volumes : ""}></input>

                        <label for="select-publisher">Publisher</label>
                        <select id="select-publisher" name="publisher">
                            <option value="">select</option>
                            {["DENPA", "Kodansha", "Medibang", "Seven Seas", "TOKYOPOP", "Udon Entertainment", "VIZ Media", "Yen Press", "Square Enix", "One Peace Books", "Vertical", "SuBLime", "Dark Horse Comics", "Animate International", "Inklore"].sort().map((publisher, index) => {
                                return (
                                    <option value={publisher} selected={this.state.selected != -1 ? this.state.series[this.state.selected].publisher == publisher : false}>{publisher}</option>
                                )
                            })}
                        </select>

                        <hr></hr>
                        <label for="select-read-vol">Volumes Read</label>
                        <input id="select-read-vol" name="read-vol" placeholder="0" type="number" defaultValue={this.state.selected != -1 ? this.state.series[this.state.selected].read.volumes : ""}></input>

                        <label for="select-read-chap">Chapters Read</label>
                        <input id="select-read-chap" name="read-chap" placeholder="0" type="number" defaultValue={this.state.selected != -1 ? this.state.series[this.state.selected].read.chapters : ""}></input>

                        <label for="select-tags">Tags</label>
                        <input id="select-tags" name="tags" placeholder="Tags" type="text" defaultValue={this.state.selected != -1 ? this.state.series[this.state.selected].tags.join(", ") : ""}></input>

                        <hr></hr>
                        <button disabled="" type="button" onClick={this.update}>{this.state.selected != -1 ? "Update" : "Add"}</button>
                        {this.state.selected != null && this.state.selected != -1 && 
                            <button disabled="" type="button" onClick={this.delete}>Delete</button>
                        }
                    </form>
                </div>
                }
            </div>
        )
    }
}

const el = document.querySelector("#root");
const data = localStorage.getItem("data") != null ? JSON.parse(localStorage.getItem("data")) : {"categories": [], "series": []};
ReactDOM.render(<Root data={data}></Root>, el);