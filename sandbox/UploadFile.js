import React, { Component } from 'react';
import { Storage, API, graphqlOperation, Auth } from 'aws-amplify'
import * as mutations from '../graphql/mutations';
import * as queries from '../graphql/queries';

// define a data packet JSON object
let packet = {
  group: [
    { userID: "" },
    { userID: "" },
    { userID: "" },
    { userID: "" },
    { userID: "" },
  ],
  filenames: [ // dynamic
    { name: "" }
  ],
  play: false,
  stop: false,
  parameters: {
    volume: 0.0,
    echo: {
      apply: false,
      delay: 10.0,
      feedback: 0.0,
      dry: 0.0,
      wet: 0.0
    },
    equalizer: {
      apply: false,
      lowgain: 0.0,
      midgain: 0.0,
      highgain: 0.0
    },
    flange: {
      apply: false,
      mix: 0.0,
      depth: 0.01,
      rate: 0.0
    },
    pitchshift: {
      apply: false,
      pitch: 1.0,
      fftsize: 1024,
      //overlap (REMOVED FMOD PARAMETER)
      maxchannels: 0
    }
  }
};

// set the JSON file prefix to the users uuid ("sub")
let jsonFilePrefix = 'default';
Auth.currentAuthenticatedUser().then((user) => {
  jsonFilePrefix = user.attributes.sub;
  packet.group[0].userID = user.attributes.sub;
})

class UploadFile extends Component {
      constructor(props) {
        super(props);

        this.state = {
          Filenames: [{ name: "" }],
          playValue: "true",
          stop: "false",
          volume: "0.0",
          eqapply: "false",
          eqlowgain: "0.0",
          eqmidgain: "0.0",
          eqhighgain: "0.0",
          echoapply: "false",
          echodelay: "10.0",
          echofeedback: "0.0",
          echodry: "0.0",
          echowet: "0.0",
          flangeapply: "false",
          flangemix: "0.0",
          flangedepth: "0.01",
          flangerate: "0.0",
          pitchapply: "false",
          pitchpitch: "1.0",
          pitchfftsize: "1024",
          pitchmaxchannels: "0.0"
        };

        this.updatePlayState = this.updatePlayState.bind(this);
        this.updateFileName = this.updateFileName.bind(this);
        this.updateVolume = this.updateVolume.bind(this);
        this.applyEq = this.applyEq.bind(this);
        this.updateHighEq = this.updateHighEq.bind(this);
        this.updateMidEq = this.updateMidEq.bind(this);
        this.updateLowEq = this.updateLowEq.bind(this);
        this.applyEcho = this.applyEcho.bind(this);
        this.updateEchoDelay = this.updateEchoDelay.bind(this);
        this.updateEchoFeedback = this.updateEchoFeedback.bind(this);
        this.udpateEchoWetVolume = this.udpateEchoWetVolume.bind(this);
        this.udpateEchoDryVolume = this.udpateEchoDryVolume.bind(this);
        this.applyFlange = this.applyFlange.bind(this);
        this.updateFlangeMix = this.updateFlangeMix.bind(this);
        this.updateFlangeDepth = this.updateFlangeDepth.bind(this);
        this.updateFlangeRate = this.updateFlangeRate.bind(this);
        this.applyPitch = this.applyPitch.bind(this);
        this.updatePitchPitch = this.updatePitchPitch.bind(this);
        this.updatePitchFFTsize = this.updatePitchFFTsize.bind(this);
        this.updatePitchMaxchannels = this.updatePitchMaxchannels.bind(this);
      }

      uploadAudioFile = async (evt) => {
        // get the file and file name
        const file = evt.target.files[0];
        const name = file.name;

        // get all files currently in database
        const audioFiles = await API.graphql(graphqlOperation(queries.listAudios));
        const items = audioFiles.data.listAudios.items;

        // check if file name already exists for current user
        var fileExists = false;
        for (const i in items) {
          if(items[i].name === name) {
            fileExists = true;
          }
        }
        
        if(!fileExists) {
          // define metadata for the file
          const audioFile = {
            bucket: 'cs-audiofile-bucketdefault-default',
            region: 'us-west-2',
            key: '/public/' + name
          };
          
          const audioFileDetails = {
            name: name,
            file: audioFile
          };

          try {
            // put file into S3
            await Storage.put(name, file, { contentType: 'mimeType' }).then(() => {
              this.setState({ file: name });
            })
            .catch(err => console.log(err));

            // create pointer in dynamoDB
            const newAudio = await API.graphql(graphqlOperation(mutations.createAudio, {input: audioFileDetails}));

            window.alert('File successfully uploaded');
          } catch (err) {
            console.log('error: ', err);
          }
        } else {
          window.alert('Selected file already exists in your database.');
        }
      }

      // send data packet to public bucket directory
      sendPacket = () => {
        packet.filenames = this.state.Filenames;
        packet.play = this.state.playValue;
        packet.stop = this.state.stop;
        packet.parameters.volume = this.state.volume;
        packet.parameters.equalizer.apply = this.state.eqapply;
        packet.parameters.equalizer.lowgain = this.state.eqlowgain;
        packet.parameters.equalizer.midgain = this.state.eqmidgain;       
        packet.parameters.equalizer.highgain = this.state.eqhighgain;
        packet.parameters.echo.apply = this.state.echoapply;
        packet.parameters.echo.delay = this.state.echodelay;
        packet.parameters.echo.feedback = this.state.echofeedback;
        packet.parameters.echo.wet = this.state.echowet;
        packet.parameters.echo.dry = this.state.echodry;
        packet.parameters.flange.apply = this.state.flangeapply;
        packet.parameters.flange.mix = this.state.flangemix;
        packet.parameters.flange.depth = this.state.flangedepth;
        packet.parameters.flange.rate = this.state.flangerate;
        packet.parameters.pitchshift.apply = this.state.pitchapply;
        packet.parameters.pitchshift.pitch = this.state.pitchpitch;
        packet.parameters.pitchshift.fftsize = this.state.pitchfftsize;
        packet.parameters.pitchshift.maxchannels = this.state.pitchmaxchannels;
        // debugging purposes
        console.log(packet);

        Storage.put(jsonFilePrefix + '.json', packet)
        .then (result => console.log(result))
        .catch(err => console.log(err));

      }

      updatePlayState(event) {
        if(event.target.value === "stop") {
          this.setState({ stop: "true" });
        }

        if(event.target.value === "play") {
          this.setState({ playValue: "true", stop: "false" });
        }

        if(event.target.value === "pause") {
          this.setState({ playValue: "false", stop: "false" });
        }
      }
/*
      updateFileName(event) {
        this.setState({ Filename: event.target.value });
      }
*/
      updateFileName = idx => event => {
        const newFilenames = this.state.Filenames.map((filename, sidx) => {
          if(idx !== sidx) {
            return filename;
          }

          return { ...filename, name: event.target.value };
        })

        this.setState({ Filenames: newFilenames })
      }

      removeFilename = idx => () => {
        this.setState({
          Filenames: this.state.Filenames.filter((s, sidx) => idx !== sidx)
        });
      }

      addFilename = () => {
        this.setState({
          Filenames: this.state.Filenames.concat([{ name: "" }])
        });
      }

      updateVolume(event) {
        this.setState({ volume: event.target.value });
      }

      applyEq(event) {
        if(event.target.checked) {
          this.setState({ eqapply: "true" });
        } else {
          this.setState({ eqapply: "false" });
        }
      }

      updateLowEq(event) {
        this.setState({ eqlowgain: event.target.value });
      }

      updateMidEq(event) {
        this.setState({ eqmidgain: event.target.value });
      }

      updateHighEq(event) {
        this.setState({ eqhighgain: event.target.value });
      }

      applyEcho(event) {
        if(event.target.checked) {
          this.setState({ echoapply: "true" });
        } else {
          this.setState({ echoapply: "false" });
        }
      }

      updateEchoDelay(event) {
        this.setState({ echodelay: event.target.value });
      }
      
      updateEchoFeedback(event) {
        this.setState({ echofeedback: event.target.value });
      }

      udpateEchoWetVolume(event) {
        this.setState({ echowet: event.target.value });
      }

      udpateEchoDryVolume(event) {
        this.setState({ echodry: event.target.value });
      }

      applyFlange(event) {
        if(event.target.checked) {
          this.setState({ flangeapply: "true" });
        } else {
          this.setState({ flangeapply: "false" });
        }
      }

      updateFlangeMix(event) {
        this.setState({ flangemix: event.target.value });
      }

      updateFlangeDepth(event) {
        this.setState({ flangedepth: event.target.value });
      }

      updateFlangeRate(event) {
        this.setState({ flangerate: event.target.value });
      }

      applyPitch(event) {
        if(event.target.checked) {
          this.setState({ pitchapply: "true" });
        } else {
          this.setState({ pitchapply: "false" });
        }
      }

      updatePitchPitch(event) {
        this.setState({ pitchpitch: event.target.value });
      }

      updatePitchFFTsize(event) {
        this.setState({ pitchfftsize: event.target.value });
      }

      updatePitchMaxchannels(event) {
        this.setState({ pitchmaxchannels: event.target.value });
      }

      render() {
        return (
            <>
              <div>
                <h2>Upload a file</h2>
                <input type="file" onChange={this.uploadAudioFile} />
              </div>
              <div>
                <h2>Play Music</h2>
                <form>
                  <h3> Playlist </h3>
                    { this.state.Filenames.map((filename, idx) => (
                      <div>
                        <input 
                          type="text"
                          placeholder={`File #${idx + 1}`}
                          value={filename.name}
                          onChange={this.updateFileName(idx)}
                        />
                        <button
                          type="button"
                          onClick={this.removeFilename(idx)}
                        >
                          Remove
                        </button>
                      </div>
                    )) }
                    <button
                      type="button"
                      onClick={this.addFilename}
                    >Add File</button>
                </form>
                <label>
                  Play/Pause/Stop
                  <select onChange={this.updatePlayState}>
                    <option value="play">play</option>
                    <option value="pause">pause</option>
                    <option value="stop">stop</option>
                  </select>
                </label>
                <label>
                  Volume:
                  <input type="number" step="0.1" onChange={this.updateVolume} />
                </label>
              </div>
              <h3>Effects</h3>
              <div>
                <h5>EQ:</h5>
                <input type="checkbox" onChange={this.applyEq} />
                <label>
                  Low Gain:
                  <input type="number" step="0.1" onChange={this.updateLowEq} />
                </label>
                <label>
                  Mid Gain:
                  <input type="number" step="0.1" onChange={this.updateMidEq} />
                </label>
                <label>
                  High Gain:
                  <input type="number" step="0.1" onChange={this.updateHighEq} />
                </label>
              </div>
              <div>
                <h5>Echo:</h5>
                <input type="checkbox" onChange={this.applyEcho} />
                <label>
                  Delay:
                  <input type="number" step="0.1" onChange={this.updateEchoDelay} />
                </label>
                <label>
                  Feedback:
                  <input type="number" step="0.1" onChange={this.updateEchoFeedback} />
                </label>
                <label>
                  Wet Volume:
                  <input type="number" step="0.1" onChange={this.udpateEchoWetVolume} />
                </label>
                <label>
                  Dry Volume:
                  <input type="number" step="0.1" onChange={this.udpateEchoDryVolume} />
                </label>
              </div>
              <div>
                <h5>Flange:</h5>
                <input type="checkbox" onChange={this.applyFlange} />
                <label>
                  Mix:
                  <input type="number" step="0.1" onChange={this.updateFlangeMix} />
                </label>
                <label>
                  Depth:
                  <input type="number" step="0.1" onChange={this.updateFlangeDepth} />
                </label>
                <label>
                  Rate:
                  <input type="number" step="0.1" onChange={this.updateFlangeRate} />
                </label>
              </div>
              <div>
                <h5>Pitch-shift:</h5>
                <input type="checkbox" onChange={this.applyPitch} />
                <label>
                  Pitch:
                  <input type="number" step="0.1" onChange={this.updatePitchPitch} />
                </label>
                <label>
                  FFT Size:
                  <input type="number" step="256" onChange={this.updatePitchFFTsize} />
                </label>
                <label>
                  Channels:
                  <input type="number" step="1" onChange={this.updatePitchMaxchannels} />
                </label>
              </div>
              <p></p>
              <button onClick={this.sendPacket}>Update Audio</button>
            </>
        );
      }
}

export default UploadFile;