/*
 *
 * CreateImportPage
 *
 */

import React, {Component, memo} from 'react';
import {HeaderNav, LoadingIndicator, PluginHeader} from 'strapi-helper-plugin'
import {Button, InputNumber, InputText, Label, Select} from '@buffetjs/core'
import pluginId from '../../pluginId';
import Container from "../../components/Container"
import Row from "../../components/Row"
import Block from "../../components/Block"
import UploadFileForm from '../../components/UploadFileForm'
import axios from 'axios'
import _ from 'lodash'
import {api_url} from "../../constants";
import MappingTable from "../../components/MappingTable";
import ExternalUrlForm from "../../components/ExternalUrlForm";
import RawInputForm from "../../components/RawInputForm";


const getUrl = to => to ? `/plugins/${pluginId}/${to}` : `/plugins/${pluginId}`;


class CreateImportPage extends Component {

  state = {
    importSource: 'raw',
    selectedContentType: '',
    loading: true,
    models: [],
    modelOptions: [],
    inputFormatSettings: {delimiter: ',', skipRows: 0},
    fieldMapping: {},
    analysing: false,
    analyzeError: null, // TODO check this
    analysisConfig: null,
    analysis: null,
    saving: false,
    saveError: null, // TODO check this
    created: null,
  }

  importSources = [
    {label: 'External URL ', value: 'url'},
    {label: 'Upload file', value: 'upload'},
    {label: 'Raw text', value: 'raw'}
  ]

  /*Check if user specified any field mapping or not*/
  isEmptyMapping = () => {
    const {fieldMapping} = this.state
    return _.isEmpty(_.pickBy(fieldMapping, o => o.targetField !== 'none'))
  }

  getTargetModel = () => {
    const {models} = this.state;
    if (!models) return null; // TODO check this
    return models.find(model => model.name === this.state.selectedContentType)
  };

  saveImportConfig = async (importConfig) => {
    this.setState({saving: true}, async () => {
      try {
        await axios.post(api_url + 'import-plugin', importConfig)
        this.setState({saving: false}, () => {
          strapi.notification.info(
            `Import Started`
          );
        })
      } catch (e) {
        strapi.notification.error(
          `${e}`
        );
      }
    })
  }

  onSaveImport = () => {
    const {selectedContentType, fieldMapping} = this.state;
    const {analysisConfig} = this;

    const analysisConfigWithSettings = this.getAnalysisConfigWithSettings(
      analysisConfig
    );

    const importConfig = {
      ...analysisConfigWithSettings,
      contentType: selectedContentType,
      fieldMapping
    };

    this.saveImportConfig(importConfig);
  };

  setFieldMapping = fieldMapping => {
    this.setState({fieldMapping});
  };

  preAnalyze = async (analysisConfigWithSettings) => {
    this.setState({analysing: true}, async () => {
      console.log(analysisConfigWithSettings)
      try {
        const res = await axios.post(
          api_url + 'import-plugin/preAnalyzeImportFile',
          analysisConfigWithSettings)
        if (res && res.data) {
          console.log(res.data)
          this.setState({analysis: res.data, analysing: false}, () => {
            strapi.notification.success(
              `Analyzed Successfully`
            );
          })
        } else {
          this.setState({analysing: false}, () => {
            strapi.notification.error(
              `Analyze Failed, try again`
            );
          })
        }
      } catch (e) {
        this.setState({analysing: false}, () => {
          strapi.notification.error(
            `${e}`
          );
        })
      }
    })
  }

  getModels = async () => {
    this.setState({loading: true})
    try {
      let models = null
      const res = await axios.get(api_url + 'content-type-builder/models')
      if (res && res.data && res.data.allModels) {
        models = res.data.allModels.filter(m => ['permission', 'role', 'user', 'importconfig', 'importeditem'].indexOf(m.name) < 0)
      }
      let modelOptions = []
      if (models) {
        modelOptions = _.map(models, (m) => {
          return {
            label: m.name,
            value: m.name
          }
        })
      }
      this.setState({loading: false})
      return {models, modelOptions}
    } catch (e) {
      this.setState({loading: false}, () => {
        strapi.notification.error(
          `${e}`
        );
      })
    }
    return []
  }

  selectImportSource = (importSource) => {
    this.setState({importSource});
  }

  selectImportDest = (selectedContentType) => {
    this.setState({selectedContentType});
  }

  onRequestAnalysis = async analysisConfig => {
    this.analysisConfig = analysisConfig;

    const analysisConfigWithSettings = this.getAnalysisConfigWithSettings(
      analysisConfig
    );

    this.preAnalyze(analysisConfigWithSettings)
  };

  getAnalysisConfigWithSettings = analysisConfig => {
    const {inputFormatSettings} = this.state;

    return {
      ...analysisConfig,
      options: {
        ...analysisConfig.options,
        ...inputFormatSettings
      }
    };
  };

  componentDidMount() {
    this.getModels().then(res => {
      const {models, modelOptions} = res
      this.setState({models, modelOptions, selectedContentType: modelOptions ? modelOptions[0].label : ''})
    })
  }


  render() {
    const {modelOptions, loading, inputFormatSettings, fieldMapping} = this.state
    return (
      <Container className={"container-fluid"}>
        <PluginHeader
          title={"Import Plugin"}
          description={"Import CSV and RSS-Feed into your Content Types"}
        />
        <Row>
          <HeaderNav
            links={[
              {
                name: "Import Data",
                to: getUrl(''),
              },
              {
                name: "Import History",
                to: getUrl('history'),
              },
            ]}
            style={{marginTop: '4.4rem'}}
          />
        </Row>
        <div className={"row"}>
          <Block
            title="General"
            description="Configure the Import Source & Destination"
            style={{marginBottom: 12}}
          >
            {loading && (
              <LoadingIndicator/>
            )}
            {!loading && modelOptions && (
              <div className={''}>
                <form>
                  <Row>
                    <>
                      <Label htmlFor="importSource">Import Source</Label>
                      <Select
                        name="importSource"
                        options={this.importSources}
                        value={this.state.importSource} // observe our state
                        onChange={({target: {value}}) => this.selectImportSource(value)}
                      />
                    </>
                  </Row>
                </form>
                <form>
                  <Row className="">
                    <>
                      <Label htmlFor="importDest">Import Destination</Label>
                      <Select
                        value={this.state.selectedContentType} // observe our state
                        name="importDest"
                        options={this.state.modelOptions}
                        onChange={({target: {value}}) => this.selectImportDest(value)}
                      />
                    </>
                  </Row>
                  <Row>
                    {this.state.importSource === 'upload' && (
                      <UploadFileForm
                        onRequestAnalysis={this.onRequestAnalysis}
                        loadingAnalysis={this.state.analysing}
                      />
                    )}
                    {this.state.importSource === 'url' && (
                      <ExternalUrlForm
                        onRequestAnalysis={this.onRequestAnalysis}
                        loadingAnalysis={this.state.analysing}
                      />
                    )}
                    {this.state.importSource === 'raw' && (
                      <RawInputForm
                        onRequestAnalysis={this.onRequestAnalysis}
                        loadingAnalysis={this.state.analysing}
                      />
                    )}
                  </Row>
                  {this.state.analysis && this.state.analysis.sourceType === 'csv' && ( // show only when data type is CSV
                    <Row className={'row'}>
                      <div className={'col-6'}>
                        <Label message={'Delimiter'} htmlFor={'delimiterInput'}/>
                        <InputText
                          name={'delimiterInput'}
                          onChange={
                            ({target: {value}}) => {
                              const state = _.set(
                                this.state,
                                ['inputFormatSettings', 'delimiter'],
                                value
                              )
                              this.setState(state)
                            }
                          }
                          value={inputFormatSettings.delimiter}
                        />
                      </div>
                      <div className={'col-6'}>
                        <Label message={'Skip Rows'} htmlFor={'skipInput'}/>
                        <InputNumber
                          name={'skipInput'}
                          onChange={
                            ({target: {value}}) => {
                              const state = _.set(
                                this.state,
                                ['inputFormatSettings', 'skipRows'],
                                value
                              )
                              this.setState(state)
                            }
                          }
                          value={inputFormatSettings.skipRows}
                        />
                      </div>
                    </Row>
                  )}
                </form>
              </div>
            )}
          </Block>
        </div>
        {this.state.analysis && (
          <Row class="row">
            <MappingTable
              analysis={this.state.analysis}
              targetModel={this.getTargetModel()}
              onChange={this.setFieldMapping}
            />
            {!this.state.saving && (
              <Button
                style={{marginTop: 12}}
                label={"Import"}
                color={this.isEmptyMapping() ? 'delete' : 'primary'}
                disabled={this.isEmptyMapping()}
                onClick={this.onSaveImport}
              />
            )}
          </Row>
        )}
      </Container>
    )
  }
}

export default memo(CreateImportPage)