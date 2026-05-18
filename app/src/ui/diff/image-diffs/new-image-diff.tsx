import * as React from 'react'

import { Image } from '../../../models/diff'
import { ImageContainer } from './image-container'
import { TabBar, TabBarType } from '../../tab-bar'

interface INewImageDiffProps {
  readonly current: Image
  readonly renderCodeDiff?: () => React.ReactNode
}

interface INewImageDiffState {
  readonly showCode: boolean
}

/** A component to render when a new image has been added to the repository */
export class NewImageDiff extends React.Component<
  INewImageDiffProps,
  INewImageDiffState
> {
  public constructor(props: INewImageDiffProps) {
    super(props)
    this.state = { showCode: props.renderCodeDiff !== undefined }
  }

  public componentDidUpdate(prevProps: INewImageDiffProps) {
    if (!prevProps.renderCodeDiff && this.props.renderCodeDiff) {
      this.setState({ showCode: true })
    }
  }

  private onTabClicked = (index: number) => {
    this.setState({ showCode: index === 0 })
  }

  public render() {
    const { renderCodeDiff } = this.props

    if (!renderCodeDiff) {
      return (
        <div className="panel image" id="diff">
          <div className="image-diff-current">
            <div className="image-diff-header">Added</div>
            <ImageContainer image={this.props.current} />
          </div>
        </div>
      )
    }

    const { showCode } = this.state

    if (showCode) {
      return (
        <div className="panel svg-diff-container svg-2tab">
          <TabBar
            selectedIndex={0}
            onTabClicked={this.onTabClicked}
            type={TabBarType.Switch}
          >
            <span>Code</span>
            <span>Image</span>
          </TabBar>
          {renderCodeDiff()}
        </div>
      )
    }

    return (
      <div className="panel image svg-image svg-2tab" id="diff">
        <TabBar
          selectedIndex={1}
          onTabClicked={this.onTabClicked}
          type={TabBarType.Switch}
        >
          <span>Code</span>
          <span>Image</span>
        </TabBar>
        <div className="image-diff-current">
          <div className="image-diff-header">Added</div>
          <ImageContainer image={this.props.current} />
        </div>
      </div>
    )
  }
}
