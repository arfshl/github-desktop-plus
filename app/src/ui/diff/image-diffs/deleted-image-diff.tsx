import * as React from 'react'

import { Image } from '../../../models/diff'
import { ImageContainer } from './image-container'
import { TabBar, TabBarType } from '../../tab-bar'

interface IDeletedImageDiffProps {
  readonly previous: Image
  readonly renderCodeDiff?: () => React.ReactNode
}

interface IDeletedImageDiffState {
  readonly showCode: boolean
}

/** A component to render when the file has been deleted from the repository */
export class DeletedImageDiff extends React.Component<
  IDeletedImageDiffProps,
  IDeletedImageDiffState
> {
  public constructor(props: IDeletedImageDiffProps) {
    super(props)
    this.state = { showCode: props.renderCodeDiff !== undefined }
  }

  public componentDidUpdate(prevProps: IDeletedImageDiffProps) {
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
          <div className="image-diff-previous">
            <div className="image-diff-header">Deleted</div>
            <ImageContainer image={this.props.previous} />
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
        <div className="image-diff-previous">
          <div className="image-diff-header">Deleted</div>
          <ImageContainer image={this.props.previous} />
        </div>
      </div>
    )
  }
}
