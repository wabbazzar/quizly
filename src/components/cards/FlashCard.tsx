import React, { FC, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withSpring,
  interpolate,
  runOnJS,
  useAnimatedGestureHandler,
} from 'react-native-reanimated';
import {
  PanGestureHandler,
  PanGestureHandlerGestureEvent,
} from 'react-native-gesture-handler';
import { Card } from '@/types';
import { colors, spacing, typography, shadows, borderRadius } from '@/theme';

interface FlashCardProps {
  card: Card;
  isFlipped: boolean;
  frontSides: string[];
  backSides: string[];
  onFlip: () => void;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.3;
const SWIPE_VELOCITY = 500;

export const FlashCard: FC<FlashCardProps> = ({
  card,
  isFlipped,
  frontSides,
  backSides,
  onFlip,
  onSwipeLeft,
  onSwipeRight,
}) => {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const rotation = useSharedValue(0);
  const flipRotation = useSharedValue(0);

  useEffect(() => {
    flipRotation.value = withTiming(isFlipped ? 180 : 0, { duration: 300 });
  }, [isFlipped]);

  // Reset card position when card changes
  useEffect(() => {
    translateX.value = withSpring(0);
    translateY.value = withSpring(0);
    rotation.value = withSpring(0);
  }, [card]);

  const gestureHandler = useAnimatedGestureHandler<PanGestureHandlerGestureEvent>({
    onActive: (event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY * 0.1;
      rotation.value = interpolate(
        event.translationX,
        [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
        [-15, 0, 15]
      );
    },
    onEnd: (event) => {
      if (
        Math.abs(event.translationX) > SWIPE_THRESHOLD ||
        Math.abs(event.velocityX) > SWIPE_VELOCITY
      ) {
        if (event.translationX > 0) {
          translateX.value = withSpring(SCREEN_WIDTH * 2);
          runOnJS(onSwipeRight)();
        } else {
          translateX.value = withSpring(-SCREEN_WIDTH * 2);
          runOnJS(onSwipeLeft)();
        }
      } else {
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        rotation.value = withSpring(0);
      }
    },
  });

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotateZ: `${rotation.value}deg` },
    ],
  }));

  const frontAnimatedStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(flipRotation.value, [0, 180], [0, 180]);
    return {
      transform: [{ rotateY: `${rotateY}deg` }],
      backfaceVisibility: 'hidden',
    };
  });

  const backAnimatedStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(flipRotation.value, [0, 180], [180, 360]);
    return {
      transform: [{ rotateY: `${rotateY}deg` }],
      backfaceVisibility: 'hidden',
    };
  });

  const swipeIndicatorStyle = useAnimatedStyle(() => {
    const rightOpacity = interpolate(
      translateX.value,
      [0, SWIPE_THRESHOLD],
      [0, 1],
      'clamp'
    );
    const leftOpacity = interpolate(
      translateX.value,
      [-SWIPE_THRESHOLD, 0],
      [1, 0],
      'clamp'
    );

    return {
      rightIndicator: {
        opacity: rightOpacity,
      },
      leftIndicator: {
        opacity: leftOpacity,
      },
    };
  });

  const renderCardSide = (sides: string[], label: string) => {
    return (
      <View style={styles.cardContent}>
        <Text style={styles.sideLabel}>{label}</Text>
        {sides.map((side) => {
          const content = card[side as keyof Card];
          if (!content) return null;
          return (
            <Text key={side} style={styles.cardText}>
              {content}
            </Text>
          );
        })}
      </View>
    );
  };

  return (
    <PanGestureHandler onGestureEvent={gestureHandler}>
      <Animated.View style={[styles.cardWrapper, cardAnimatedStyle]}>
        <Pressable onPress={onFlip} style={styles.cardPressable}>
          {/* Front of card */}
          <Animated.View style={[styles.card, frontAnimatedStyle]}>
            {renderCardSide(frontSides, 'Front')}

            {/* Swipe indicator - Right (Correct) */}
            <Animated.View
              style={[
                styles.swipeIndicator,
                styles.swipeIndicatorRight,
                swipeIndicatorStyle.rightIndicator,
              ]}
              pointerEvents="none"
            >
              <Text style={styles.swipeIndicatorText}>✓</Text>
            </Animated.View>

            {/* Swipe indicator - Left (Incorrect) */}
            <Animated.View
              style={[
                styles.swipeIndicator,
                styles.swipeIndicatorLeft,
                swipeIndicatorStyle.leftIndicator,
              ]}
              pointerEvents="none"
            >
              <Text style={styles.swipeIndicatorText}>✗</Text>
            </Animated.View>
          </Animated.View>

          {/* Back of card */}
          <Animated.View style={[styles.card, styles.cardBack, backAnimatedStyle]}>
            {renderCardSide(backSides, 'Back')}
          </Animated.View>
        </Pressable>
      </Animated.View>
    </PanGestureHandler>
  );
};

const styles = StyleSheet.create({
  cardWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardPressable: {
    width: '100%',
    aspectRatio: 0.65,
    maxWidth: 350,
  },
  card: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: colors.neutral.white,
    borderRadius: borderRadius.xl,
    ...shadows.lg,
  },
  cardBack: {
    position: 'absolute',
  },
  cardContent: {
    flex: 1,
    padding: spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sideLabel: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    ...typography.body.small,
    color: colors.neutral.gray400,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  cardText: {
    ...typography.card.primary,
    textAlign: 'center',
    marginVertical: spacing.sm,
  },
  swipeIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: borderRadius.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  swipeIndicatorRight: {
    backgroundColor: colors.semantic.success,
  },
  swipeIndicatorLeft: {
    backgroundColor: colors.semantic.error,
  },
  swipeIndicatorText: {
    fontSize: 72,
    fontWeight: 'bold',
    color: colors.neutral.white,
  },
});