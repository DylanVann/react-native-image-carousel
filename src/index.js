/* @flow */

import {
  Animated,
  Dimensions,
  Modal,
  PanResponder,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
  Easing,
// eslint-disable-next-line
} from 'react-native';
import _ from 'lodash/fp';
// eslint-disable-next-line
import React, { Component, PropTypes } from 'react';
import SwipeableViews from 'react-swipeable-views/lib/index.native.scroll';

const ANIM_CONFIG = {
  duration: 3000,
  easing: Easing.elastic(0.5),
};

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

type Props = {
  activeProps?: Object,
  activeComponents?: [ReactElement<any>],
  zoomEnabled?: boolean,
  hideStatusBarOnOpen?: boolean,
  renderHeader?: () => ReactElement<any>,
  renderFooter?: () => ReactElement<any>,
  renderContent?: (idx: number) => ReactElement<any>,
  onIdxChange?: (idx: number) => void,
  onOpen?: () => void,
  onClose?: () => void,
};

type State = {
  origin: {
    x: number,
    y: number,
    width: number,
    height: number,
  },
  target: {
    x: number,
    y: number,
    opacity: number,
  },
  openAnim: Animated.Value,
  pan: Animated.Value,
  fullscreen: boolean,
  selectedIdx: number,
  animating: boolean,
  panning: boolean,
  selectedImageHidden: boolean,
  slidesDown: boolean,
};

export default class ImageCarousel extends Component {
  props: Props;
  state: State;
  _panResponder: PanResponder;
  _carouselItems: [View];

  static propTypes = {
    activeProps: PropTypes.object,
    zoomEnabled: PropTypes.bool,
    hideStatusBarOnOpen: PropTypes.bool,
    renderContent: PropTypes.func,
    onOpen: PropTypes.func,
    onClose: PropTypes.func,
    ...View.propTypes,
  };
  static defaultProps = {
    zoomEnabled: true,
    hideStatusBarOnOpen: true,
  };

  constructor(props: View.props) {
    super(props);

    this.state = {
      origin: {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
      },
      target: {
        x: 0,
        y: 0,
        opacity: 1,
      },
      openAnim: new Animated.Value(0),
      pan: new Animated.Value(0),
      fullscreen: false,
      selectedIdx: 0,
      animating: false,
      panning: false,
      selectedImageHidden: false,
      slidesDown: false,
    };

    this._carouselItems = _.isArray(props.children) ?
      _.map(null)(props.children) : [null];
  }

  componentWillMount() {
    this._panResponder = PanResponder.create({
      onStartShouldSetPanResponder: () => !this.state.animating,
      onStartShouldSetPanResponderCapture: () => !this.state.animating,
      onMoveShouldSetPanResponder: () => !this.state.animating,
      onMoveShouldSetPanResponderCapture: () => !this.state.animating,
      onPanResponderTerminationRequest: () => true,

      onPanResponderMove: (evt: Object, gestureState: Object) => {
        Animated.event([null, { dy: this.state.pan }])(evt, gestureState);
        if (Math.abs(gestureState.dy) > 15 && !this.state.panning) {
          this.state.pan.setValue(0);
          this.setState({ panning: true });
        }
      },
      onPanResponderRelease: this._handlePanEnd,
      onPanResponderTerminate: this._handlePanEnd,
    });
  }

  shouldComponentUpdate(nextProps: View.props, nextState: State): boolean {
    return (nextState.fullscreen || this.state.fullscreen) &&
      (!_.eq(nextState.origin, this.state.origin)
      || !_.eq(nextState.target, this.state.target)
      || nextState.panning !== this.state.panning
      || nextState.animating !== this.state.animating
      || nextState.selectedImageHidden !== this.state.selectedImageHidden
      || nextState.selectedIdx !== this.state.selectedIdx);
  }

  open = (startIdx: number) => {
    const activeComponents = this.props.activeComponents || this._carouselItems;

    this.props.hideStatusBarOnOpen && StatusBar.setHidden(true, 'fade');
    this.setState({ fullscreen: true });

    activeComponents[startIdx].measure((
      rx: number, ry: number,
      width: number, height: number,
      x: number, y: number,
    ) => {
      this.setState({
        selectedIdx: startIdx,
        animating: true,
        origin: { x, y, width, height },
        target: { x: 0, y: 0, opacity: 1 },
      });
      this.props.onIdxChange && this.props.onIdxChange(startIdx);

      Animated.timing(this.state.openAnim,
        { ...ANIM_CONFIG, toValue: 1 },
      ).start(() => {
        this.setState({ animating: false });
        this.props.onOpen && this.props.onOpen();
      });
    });
  }

  close = () => {
    const activeComponents = this.props.activeComponents || this._carouselItems;

    this.props.hideStatusBarOnOpen && StatusBar.setHidden(false, 'fade');
    this.setState({ animating: true });

    activeComponents[this.state.selectedIdx].measure((
      rx: number, ry: number,
      width: number, height: number,
      x: number, y: number,
    ) => {
      this.setState({
        origin: { x, y, width, height },
        slidesDown: x + width < 0 || x > screenWidth,
      });
      Animated.timing(
        this.state.openAnim,
        { ...ANIM_CONFIG, toValue: 0 },
      ).start(() => {
        this.setState({
          animating: false,
          fullscreen: false,
          selectedImageHidden: false,
          slidesDown: false,
        });
        this.props.onClose && this.props.onClose();
      });
    });
  }

  _handlePanEnd = (evt: Object, gestureState: Object) => {
    if (Math.abs(gestureState.dy) > 150) {
      this.setState({
        panning: false,
        target: {
          x: gestureState.dx,
          y: gestureState.dy,
          opacity: 1 - Math.abs(gestureState.dy / screenHeight),
        },
      });

      this.close();
    } else {
      Animated.timing(
        this.state.pan,
        { toValue: 0, ...ANIM_CONFIG },
      ).start(() => this.setState({ panning: false }));
    }
  }

  _getSwipeableStyle = (idx: number): Object => {
    const {
      fullscreen, openAnim, origin, selectedIdx, slidesDown, target,
    } = this.state;

    const inputRange = [0, 1];

    if (fullscreen && idx === selectedIdx) {
      return !slidesDown ? {
        left: openAnim.interpolate({
          // $FlowFixMe
          inputRange, outputRange: [origin.x, target.x],
        }),
        top: openAnim.interpolate({
          // $FlowFixMe
          inputRange, outputRange: [origin.y, target.y],
        }),
        width: openAnim.interpolate({
          // $FlowFixMe
          inputRange, outputRange: [origin.width, screenWidth],
        }),
        height: openAnim.interpolate({
          // $FlowFixMe
          inputRange, outputRange: [origin.height, screenHeight],
        }),
      } : {
        left: 0,
        right: 0,
        height: screenHeight,
        top: openAnim.interpolate({
          // $FlowFixMe
          inputRange, outputRange: [screenHeight, target.y],
        }),
      };
    }

    return { flex: 1 };
  }

  _renderFullscreen = (): ReactElement<any> => {
    const {
      animating,
      fullscreen,
      openAnim,
      pan,
      panning,
      selectedIdx,
      selectedImageHidden,
      target,
    } = this.state;

    const header = this.props.renderHeader && this.props.renderHeader();
    const footer = this.props.renderFooter && this.props.renderFooter();

    const opacity = {
      opacity: panning
        ? pan.interpolate({
          inputRange: [-screenHeight, 0, screenHeight],
          // $FlowFixMe
          outputRange: [0, 1, 0],
        })
        : openAnim.interpolate({
          inputRange: [0, 1],
          // $FlowFixMe
          outputRange: [0, target.opacity],
        }),
    };

    return (
      <Modal
        transparent
        visible={fullscreen}
        onShow={() => {
          if (!selectedImageHidden && animating) {
            this.setState({ selectedImageHidden: true });
          }
        }}
      >
        <Animated.View style={[styles.modalBackground, opacity]} />
        <SwipeableViews
          style={StyleSheet.absoluteFill}
          index={selectedIdx}
          onChangeIndex={(idx: number) => {
            this.setState({ selectedIdx: idx });
            this.props.onIdxChange && this.props.onIdxChange(idx);
          }}
          scrollEnabled={!animating && !panning}
        >
          {_
            .map
            .convert({ cap: false })(
              (child: ReactElement<any>, idx: number): ReactElement<any> => {
                const content =
                  this.props.renderContent && this.props.renderContent(idx);

                return (
                  <Animated.View
                    key={idx}
                    style={[
                      this._getSwipeableStyle(idx),
                      (selectedIdx === idx && panning) &&
                        { top: this.state.pan },
                    ]}
                  >
                    <ScrollView
                      style={{ flex: 1 }}
                      contentContainerStyle={{ flex: 1 }}
                      maximumZoomScale={this.props.zoomEnabled ? 2 : 1}
                      alwaysBounceVertical={false}
                    >
                      {content
                        ? React.cloneElement(content, {
                          ...this._panResponder.panHandlers,
                        })
                        : React.cloneElement(child, {
                          ...child.props,
                          ...this.props.activeProps,
                          ...this._panResponder.panHandlers,
                        })
                      }
                    </ScrollView>
                  </Animated.View>
                );
              },
            )(_.isArray(this.props.children)
              ? this.props.children : [this.props.children]
            )
          }
        </SwipeableViews>
        <Animated.View style={[opacity, styles.headerContainer]}>
          {header ? React.cloneElement(header, {
              ...header.props,
              style: [header.props.style],
            }) : (
            <TouchableWithoutFeedback onPress={this.close}>
              <View>
                <Text style={styles.closeText}>Close</Text>
              </View>
            </TouchableWithoutFeedback>
            )
          }
        </Animated.View>
        {footer &&
          <Animated.View style={[opacity, styles.footerContainer]}>
            {footer}
          </Animated.View>
        }
      </Modal>
    );
  }

  render(): ReactElement<any> {
    const { children, style } = this.props;
    const { animating, selectedImageHidden, selectedIdx } = this.state;

    return (
      <View style={style}>
        <ScrollView
          horizontal
          scrollEnabled={!animating}
          alwaysBounceHorizontal={false}
          showsHorizontalScrollIndicator={false}
        >
          {_.map.convert({ cap: false })(
            (child: ReactElement<any>, idx: number) => (
              <TouchableWithoutFeedback
                key={idx}
                onPress={() => this.open(idx)}
              >
                <View
                  ref={(carouselItem: View) => {
                    this._carouselItems[idx] = carouselItem;
                  }}
                  // eslint-disable-next-line react-native/no-inline-styles
                  style={{
                    opacity: selectedImageHidden && selectedIdx === idx ? 0 : 1,
                  }}
                >
                  {child}
                </View>
              </TouchableWithoutFeedback>
          ))(_.isArray(children) ? children : [children])}
        </ScrollView>
        {this.state.fullscreen && this._renderFullscreen()}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  modalBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'black',
  },
  headerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  footerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  closeText: {
    color: 'white',
    textAlign: 'right',
    padding: 10,
  },
});
