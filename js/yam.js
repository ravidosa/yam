class Root extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            categories: this.props.data.categories,
            series: this.props.data.series,
            selected: null
        };
        this.update = this.update.bind(this);
        this.delete = this.delete.bind(this);
        this.download = this.download.bind(this);
        this.upload = this.upload.bind(this);
    }
    update() {
        const form = document.getElementById("form");
        const formData = new FormData(form);
        const updated = {
            title: {en: formData.get("title-en"), int: formData.get("title-int")},
            author: formData.get("author"),
            artist: formData.get("artist"),
            translator: formData.get("translator"),
            volumes: formData.get("volumes"),
            tags: formData.get("tags").split(/,\s*/)
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
    render() {
        return(
            <div>
                <div id="list">
                    <div id="new-series" className="series" onClick={() => {this.setState({selected: -1})}}><h6>+ New Series</h6></div>
                    <div id="edit-categories" className="series" onClick={() => {let categories = prompt("Edit Categories:", this.state.categories.join(", ")); this.setState({categories: categories.split(/,\s*/)})}}><h6>Edit Categories</h6></div>
                    <div>
                        <input id="upload" type="file" onChange={this.upload}></input>
                        <button id="download" onClick={this.download}>Download</button>
                    </div>
                    <hr></hr>
                    {
                        this.state.categories.map((category, index) => {
                            return(
                                <details>
                                    <summary>{category}</summary>
                                    {this.state.series.filter((manga) => manga.tags.includes(category)).map((manga, index) => {
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
                        {this.state.series.filter((manga) => this.state.categories.every((category) => !manga.tags.includes(category))).map((manga, index) => {
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
                        <input id="select-author" name="author" placeholder="Author" type="text" defaultValue={this.state.selected != -1 ? this.state.series[this.state.selected].author : ""}></input>
                        <label for="select-artist">Artist</label>
                        <input id="select-artist" name="artist" placeholder="Artist" type="text" defaultValue={this.state.selected != -1 ? this.state.series[this.state.selected].artist : ""}></input>
                        <label for="select-translator">Translator</label>
                        <input id="select-translator" name="translator" placeholder="Translator" type="text" defaultValue={this.state.selected != -1 ? this.state.series[this.state.selected].translator : ""}></input>
                        <hr></hr>
                        <label for="select-volumes">Volumes</label>
                        <input id="select-volumes" name="volumes" placeholder="0" type="number" defaultValue={this.state.selected != -1 ? this.state.series[this.state.selected].volumes : ""}></input>
                        <hr></hr>
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