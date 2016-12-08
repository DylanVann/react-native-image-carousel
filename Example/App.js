/* @flow */

import {
  Image,
  StatusBar,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import React, { Component } from 'react';
import ImageCarousel from 'react-native-image-carousel';

/* eslint-disable max-len */
const urls = [
  'https://d919ce141ef35c47fc40-b9166a60eccf0f83d2d9c63fa65b9129.ssl.cf5.rackcdn.com/images/67003.max-620x600.jpg',
  'https://d919ce141ef35c47fc40-b9166a60eccf0f83d2d9c63fa65b9129.ssl.cf5.rackcdn.com/images/51681.max-620x600.jpg',
  'https://d919ce141ef35c47fc40-b9166a60eccf0f83d2d9c63fa65b9129.ssl.cf5.rackcdn.com/images/66812.max-620x600.jpg',
  'https://myanimelist.cdn-dena.com/s/common/uploaded_files/1438960604-925d1997518b66f8508c749f36810793.jpeg',
];
/* eslint-enable max-len */

export default class App extends Component {
  componentWillMount() {
    StatusBar.setBarStyle('light-content');
  }

  renderImage(i: number) {
    return (
      <Image
        style={StyleSheet.absoluteFill}
        source={{ uri: urls[i] }}
        resizeMode={'contain'}
      />
    );
  }

  render(): ReactElement<any> {
    return (
      <View style={[styles.container]}>
        <ImageCarousel renderContent={this.renderImage}>
          {urls.map((url: string) => (
            <Image
              style={styles.image}
              key={url}
              source={{ uri: url, width: 200 }}
              resizeMode={'contain'}
            />
          ))}
        </ImageCarousel>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
  },
  image: {
    marginRight: 2,
    height: 100,
  },
});
