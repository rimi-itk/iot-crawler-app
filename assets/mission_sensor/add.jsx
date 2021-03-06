/* global AbortController, fetch, history, location */
import './mission_sensor.scss'

import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom'
import PropTypes from 'prop-types'
import debounce from 'debounce'

import '@fortawesome/fontawesome-free/js/all'
import Form from 'react-bootstrap/Form'
import Alert from 'react-bootstrap/Alert'
import ListGroup from 'react-bootstrap/ListGroup'
import Translator from '../translations'
import Select from 'react-select'

// @see https://www.robinwieruch.de/react-hooks-fetch-data
function App (props) {
  const [data, setData] = useState([])
  const [query, setQuery] = useState('')
  const [observationType, setObservationType] = useState(null)
  const [observationTypeOptions, setObservationTypeOptions] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const getAddSensorUrl = (sensor) => {
    return props.addSensorUrl.replace('%sensor%', encodeURIComponent(sensor.id))
  }

  const getEditSensorUrl = (sensor) => {
    return props.editSensorUrl.replace('%sensor%', encodeURIComponent(sensor._metadata.mission_sensor.id))
  }

  const filterObject = (object, predicate = (value) => value) => {
    const filtered = {}

    for (const [key, value] of Object.entries(object)) {
      if (predicate(value)) {
        filtered[key] = value
      }
    }

    return filtered
  }

  const isEmpty = (obj) => {
    return Object.keys(obj).length === 0 && obj.constructor === Object
  }

  const buildUrl = (url, params = {}) => {
    const theUrl = new URL(url)
    Object.keys(params).forEach(key => { if (params[key]) { theUrl.searchParams.append(key, params[key]) } })

    return theUrl
  }

  const abortController = new AbortController()

  const doSearch = debounce(
    (query) => {
      // abortController = new AbortController()
      setIsLoading(true)
      const url = buildUrl(props.searchUrl, { query, observation_type: observationType })
      const filtered = filterObject({ query, observationType })
      history.pushState(null, null, isEmpty(filtered) ? '#' : '#state=' + encodeURIComponent(JSON.stringify(filtered)))
      fetch(url, {
        headers: {
          accept: 'application/ld+json'
        },
        signal: abortController.signal
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error(response.statusText)
          }
          return response.json()
        })
        .then(data => {
          setData(data.data)
        })
        .catch(error => {
          if (error.name === 'AbortError') {
            return
          }
          setError(error.message)
        })
        .finally(() => setIsLoading(false))
    },
    200
  )

  useEffect(() => {
    const match = /^#state=(.+)$/.exec(location.hash)
    if (match?.[1]) {
      try {
        const state = JSON.parse(decodeURIComponent(match[1]))
        if (state?.query) {
          setQuery(state.query)
        }
        if (state?.observationType) {
          setObservationType(state.observationType)
        }
      } catch (ex) {}
    }

    // Load observation type options.
    const url = props.observationTypesUrl
    fetch(url)
      .then((response) => {
        return response.json()
      }).then((json) => {
        json.unshift({ value: '', label: Translator.trans('(all observation types)') })
        setObservationTypeOptions(json)
      })
  }, [])

  useEffect(() => {
    doSearch(query)

    return () => {
      abortController.abort()
    }
  }, [query, observationType])

  const missingValue = '👻'

  const renderData = () => {
    let observationTypeLabel = observationType
    observationTypeOptions.forEach(item => { if (observationType === item.value) { observationTypeLabel = item.label } })

    if ((observationType || query) && data.length === 0) {
      const queryDescription = (() => {
        if (query && observationType) {
          return Translator.trans('No sensors with type %observationType% and matching the query "%query%" found.', { query, observationType: observationTypeLabel })
        }

        if (observationType) {
          return Translator.trans('No sensors with type %observationType% found.', { observationType: observationTypeLabel })
        }

        if (query) {
          return Translator.trans('No sensors matching the query "%query%" found.', { query })
        }

        return null
      })()

      return query && <Alert variant='warning' className='py-1'>{queryDescription}</Alert>
    }

    const queryDescription = (() => {
      if (observationType && query) {
        return Translator.transChoice(
          '{0}No sensors with type %observationType% and matching the query "%query%"|{1}One sensor with type %observationType% and matching the query "%query%"|]1,Inf]%count% sensors with type %observationType% and matching the query "%query%"',
          data.length,
          { query, observationType: observationTypeLabel }
        )
      }

      if (observationType) {
        return Translator.transChoice(
          '{0}No sensors with type %observationType%|{1}One sensor with type %observationType%|]1,Inf]%count% sensors with type %observationType%',
          data.length,
          { observationType: observationTypeLabel }
        )
      }

      if (query) {
        return Translator.transChoice(
          '{0}No sensors matching the query "%query%"|{1}One sensor matching the query "%query%"|]1,Inf]%count% sensors matching the query "%query%"',
          data.length,
          { query }
        )
      }

      return Translator.transChoice(
        '{0}No sensors|{1}One sensor|]1,Inf]%count% sensors',
        data.length
      )
    })()

    return (
      <>
        <Alert variant='success' className='py-1'>{queryDescription}</Alert>

        <ListGroup variant='flush'>
          {data.map((item) => (
            <ListGroup.Item
              key={item.id}
              className='sensor-search-result pb-3'
            >
              <div className='d-flex w-100 justify-content-between'>
                {item._metadata.name
                  ? <><h2 className='h4 mb-1'>{item._metadata.name}</h2><small>{item.id}</small></>
                  : <h2 className='h4 mb-1'>{item.id}</h2>}
              </div>

              <dl className='row'>
                <dt className='col-sm-3 mission-sensor-identifier sensor-identifier'>{Translator.trans('Identifier')}</dt>
                <dd className='col-sm-9 mission-sensor-identifier sensor-identifier'>{item._metadata.identifier ?? missingValue}</dd>

                <dt className='col-sm-3 mission-sensor-observation-type sensor-observation-type'>{Translator.trans('Observation type')}</dt>
                <dd className='col-sm-9 mission-sensor-observation-type sensor-observation-type'>{item._metadata.observation_type ? Translator.trans(item._metadata.observation_type) : missingValue}</dd>

                {item._metadata.qoi &&
                  <>
                    <dt className='col-sm-3 mission-sensor-qio sensor-qio'>{Translator.trans('Quality of information')}</dt>
                    <dd className='col-sm-9 mission-sensor-qio sensor-qio'>
                      <dl className='sensor-qoi'>
                        {Object.entries(item._metadata.qoi).map(([key, value]) =>
                          value?.type === 'Property' &&
                            <React.Fragment key={key}>
                              <dt>{Translator.trans(key.replace(/^[^#]+#/, ''))}</dt>

                              {undefined !== value?.['https://w3id.org/iot/qoi#hasRatedValue']?.value &&
                                <dd>
                                  {value['https://w3id.org/iot/qoi#hasRatedValue'].value} ({Translator.trans('Rated')})
                                </dd>}

                              {undefined !== value?.['https://w3id.org/iot/qoi#hasAbsoluteValue']?.value &&
                                <dd>
                                  {value['https://w3id.org/iot/qoi#hasAbsoluteValue'].value} ({Translator.trans('Absolute')})
                                </dd>}
                            </React.Fragment>
                        )}
                      </dl>
                    </dd>
                  </>}
              </dl>

              {item._metadata.mission_sensor ? (
                <p className='text-primary'>

                  {Translator.trans(
                    'Already included in mission'
                  )}{' '}
                  <a
                    className='btn btn-primary btn-sm ml-3'
                    href={getEditSensorUrl(item)}
                  >
                    {Translator.trans('Edit')}
                  </a>
                </p>

              ) : (
                <a
                  className='btn btn-success btn-sm'
                  href={getAddSensorUrl(item)}
                >
                  <i className='fas fa-plus-circle mr-1' />{Translator.trans('Add')}
                </a>
              )}
            </ListGroup.Item>
          ))}
        </ListGroup>
      </>
    )
  }

  return (
    <div className='mission-sensor-search mt-3'>
      <Form.Group controlId='formQuery'>
        <Form.Label className='sr-only'>{Translator.trans('Search')}</Form.Label>
        <Form.Control placeholder={Translator.trans('Search for a sensor')} value={query} onChange={(event) => setQuery(event.target.value)} size='lg' />
      </Form.Group>
      <Form.Group controlId='formObservationType'>
        <Form.Label className='sr-only'>{Translator.trans('Sensor observation type')}</Form.Label>
        <Select
          options={observationTypeOptions}
          onChange={(option) => setObservationType(option.value)}
          placeholder={observationTypeOptions.length > 0 ? Translator.trans('Search for a sensor observation type') : Translator.trans('Loading sensor observation types …')}
          noOptionsMessage={() => Translator.trans('No sensor observation types loaded')}
        />
      </Form.Group>

      {error && <Alert variant='danger'>{Translator.trans('Error: %error%', { error: error })}</Alert>}

      {isLoading
        ? <Alert variant='info' className='py-1'>{Translator.trans('Searching …')}</Alert>
        : renderData()}
    </div>
  )
}

App.propTypes = {
  searchUrl: PropTypes.string.isRequired,
  addSensorUrl: PropTypes.string.isRequired,
  editSensorUrl: PropTypes.string.isRequired
}

const el = document.getElementById('app')
const options = JSON.parse(el.dataset.options || '{}')

ReactDOM.render(
  <App {...options} />,
  document.getElementById('app')
)
