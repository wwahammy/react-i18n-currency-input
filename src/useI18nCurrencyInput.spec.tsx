// License: LGPL-3.0-or-later
// from: https://github.com/jsillitoe/react-currency-input/blob/master/test/index.spec.js
import 'jest';
import * as React from 'react'
import I18nCurrencyInput from './index'
import { MoneyFormatHelper as ExportedHelper } from './index'
import { MoneyFormatHelper } from './money_format_helper'
import { FullCurrencyInputProps, useI18nCurrencyInput } from './useI18nCurrencyInput';
import { useRef } from 'react';
import { render, cleanup, fireEvent, RenderResult } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';


const nbsp = " ";

// //we uses this for testing correct behavior on modifications and mount
// interface UWInputProps {
//   initialValue: any,
//   render: (outerState: UWState) => React.ReactNode
// }

// interface UWState {
//   value: any
// }

// class UpdateWrapper extends React.Component<UWInputProps, UWState> {
//   constructor(props: UWInputProps) {
//     super(props)
//     this.state = { value: props.initialValue }
//   }

//   render() {
//     return this.props.render(this.state);
//   }
// }

function UpdateWrapper(props: Omit<FullCurrencyInputProps, 'inputRef'>) {
  const inputRef = useRef<HTMLInputElement>()
  const values = useI18nCurrencyInput({
    ...props,
    inputRef
  });
  const { maskedValue: value, onFocus, onChange, onMouseUp, onSelect } = values;
  const inputProps = { value, onFocus, onChange, onMouseUp, onSelect }
  return <div>
    <p data-testid="value">{values.value}</p>
    <p data-testid="valueInCents">{values.valueInCents}</p>
    <p data-testid="maskedValue">{values.maskedValue}</p>
    <input ref={inputRef} data-testid="input" {...inputProps} />
  </div>
}

describe('useI18nCurrencyInput', function () {
  afterEach(cleanup);

  function expectValues(beforeAction: () => RenderResult, values: string[][]) {
    it.each(values)('%s should be "%s', (id, output, type) => {
      const { getByTestId } = beforeAction();
      if (type == 'value')
        expect(getByTestId(id)).toHaveValue(output)
      else
        expect(getByTestId(id)).toHaveTextContent(output)
    })
  }

  describe('default arguments', function () {

    expectValues(() => (render(<UpdateWrapper />)),
      [['input', '$0.00', 'value'],
      ['value', '0', 'text'],
      ['valueInCents', '0', 'text'],
      ['maskedValue', '$0.00', 'text']]);
  });

  describe("start typing", function () {
    let getByTestId: any;
    expectValues(() => {
      const result = render(<UpdateWrapper />)
      getByTestId = result.getByTestId
      const input = getByTestId('input')
      fireEvent.change(getByTestId('input'), { target: { value: '$0.001' } })
      return result;
    }, [
      ['value', '0.01', 'text'],
      ['valueInCents', '1', 'text'],
      ['maskedValue', '$0.01', 'text'],
      ['input', '$0.01', 'value']
    ])

  });

  describe('properly convert number value props into display values', () => {

    it.each([
      ['adds decimals to whole numbers to match precision', 123456789, '$123,456,789.00'],
      ['Does not change value when precision matches', 1234567.89, '$1,234,567.89'],
      ['Rounds down properly when an number with extra decimals is passed in', 1234567.89123, '$1,234,567.89'],
      ['handles initial value as the integer 0', 0, '$0.00'],
      ['handles initial value as the float 0.00', 0.00, '$0.00']
    ])("%s", (_name, input, output) => {
      const { getByTestId } = render(<UpdateWrapper value={input} />)
      expect(getByTestId('input')).toHaveValue(output)
    })

  });

  describe('properly convert string value props into display values', () => {
    it.each([
      ['adds decimals to whole numbers to match precision', '6300.00', '$6,300.00'],
      ['Does not change value when precision matches', "1234567.89", '$1,234,567.89']
    ])("%s", (_name, input, output) => {
      const { getByTestId } = render(<UpdateWrapper value={input} />)
      expect(getByTestId('input')).toHaveValue(output)
    })
  });

  describe('rounding', () => {
    it.each([
      ['Rounds down properly when an number with extra decimals is passed in', 1234567.89123, '$1,234,567.89', 'USD'],
      ['Rounds up properly when an number with extra decimals is passed in', "1234567.89999", '$1,234,567.90', 'USD'],
      ['Rounds up the whole number when an number with extra decimals is passed in', 1234567.999, '¥1,234,568', 'JPY'],
    ])("%s", (_name, input, output, currency) => {
      const { getByTestId } = render(<UpdateWrapper
        value={input} currency={currency} />)
      expect(getByTestId('input')).toHaveValue(output)
    })
  });

  describe('negative numbers', () => {
    it.each([
      ['-0', 'without negative sign', "$0.00"],
      ["123456", 'with no or even number of "-" as positive', '$1,234.56'],
      ["--123456", 'with no or even number of "-" as positive', '$1,234.56'],
      ["123--456", 'with no or even number of "-" as positive', '$1,234.56'],
      ["123456--", 'with no or even number of "-" as positive', '$1,234.56'],
      ["--123--456--", 'with no or even number of "-" as positive', '$1,234.56'],
      ["123456----", 'with no or even number of "-" as positive', '$1,234.56']
    ])('should render %s %s', (_name, input, output) => {
      const { getByTestId } = render(<UpdateWrapper value={input} />)
      fireEvent.change(getByTestId('input'), { target: { value: output } });
      expect(getByTestId('input')).toHaveValue(output)
    })

    it('should correctly change between postive and negative', () => {
      const { getByTestId } = render(<UpdateWrapper value={0} />)
      fireEvent.change(getByTestId('input'), { target: { value: "123456" } });
      expect(getByTestId('input')).toHaveValue('$1,234.56')

      fireEvent.change(getByTestId('input'), { target: { value: "1,234.56-" } });
      expect(getByTestId('input')).toHaveValue('-$1,234.56')

      fireEvent.change(getByTestId('input'), { target: { value: "-1,234.56-" } });
      expect(getByTestId('input')).toHaveValue('$1,234.56')

      fireEvent.change(getByTestId('input'), { target: { value: "1-,234.56" } });
      expect(getByTestId('input')).toHaveValue('-$1,234.56')

      fireEvent.change(getByTestId('input'), { target: { value: "1---,234.56" } });
      expect(getByTestId('input')).toHaveValue('-$1,234.56')

      fireEvent.change(getByTestId('input'), { target: { value: "-1,234.-56" } });
      expect(getByTestId('input')).toHaveValue('$1,234.56')
    });
  });

  describe('separators and symbols', () => {
    it.each([
      ['1,000.01', 'handles string with separators', undefined, undefined, "$1,000.01"],
      ['$10.01', 'handles string with prefixes', undefined, undefined, '$10.01'],
      ['10.01 EUR', 'handles strings with suffixes', "de-de", 'EUR', `10,01${nbsp}€`],
      ["123.456.789,12", 'handles strings with custom separators', "de-de", undefined, `123.456.789,12${nbsp}$`],
      ["1,234,567.89", "handles 1,234,567.89 format", undefined, undefined, '$1,234,567.89'],
      ['1.234.567,89', "Handles 1.234.567,89 format", 'de-de', undefined, `1.234.567,89${nbsp}$` ],
    ])("Passing %s %s and locale %s, currency %s", (value, _name, locale, currency, output) => {
      let args:any = {value}
      if (locale)
        args['locale'] = locale
      if (currency)
        args['currency'] = currency
      const { getByTestId } = render(<UpdateWrapper {...args}/>)
      expect(getByTestId('input')).toHaveValue(output)
    })
  })

});


  // describe('change events', function () {
  //   let handleChange: any
  //   beforeEach(function () {
  //     handleChange = jest.fn()

  //     renderedComponent = ReactTestUtils.renderIntoDocument(
  //       <I18nCurrencyInput onChange={handleChange} value="0" />
  //     );

  //     inputComponent = ReactTestUtils.findRenderedDOMComponentWithTag(
  //       renderedComponent,
  //       'input'
  //     );
  //   });

  //   it('should call onChange', function () {
  //     let inputComponent = renderedComponent.inputRef.current
  //     inputComponent.value = 123456789;
  //     ReactTestUtils.Simulate.change(inputComponent);
  //     expect(handleChange).toBeCalledWith(renderedComponent, "$1,234,567.89", 1234567.89, 123456789);
  //   });


  //   it('should change the masked value', function () {
  //     inputComponent.value = 123456789;
  //     ReactTestUtils.Simulate.change(inputComponent);
  //     expect(renderedComponent.getMaskedValue()).toBe("$1,234,567.89");
  //   });


  //   it('should change the component value', function () {
  //     inputComponent.value = 123456789;
  //     ReactTestUtils.Simulate.change(inputComponent);
  //     expect(inputComponent.value).toBe("$1,234,567.89");
  //   });

  //   it('should change the input value properly when a single number is added', () => {
  //     inputComponent.value = "5"
  //     ReactTestUtils.Simulate.change(inputComponent);
  //     expect(inputComponent.value).toBe("$0.05");
  //   })

  //   it('should change the input value properly when two numbers added', () => {
  //     inputComponent.value = "55"
  //     ReactTestUtils.Simulate.change(inputComponent);
  //     expect(inputComponent.value).toBe("$0.55");
  //   })

  //   it('runs change on an initial value masking', function () {
  //     let change = jest.fn()
  //     var renderedComponent = ReactTestUtils.renderIntoDocument(
  //       <I18nCurrencyInput value={1234567.89} onChange={change} />
  //     ) as any;
  //     expect(renderedComponent.getMaskedValue()).toBe('$1,234,567.89')
  //     expect(change).toBeCalledWith(renderedComponent, '$1,234,567.89', 1234567.89, 123456789)
  //   });

  //   it('runs a change even when masking is unneeded', function () {
  //     let change = jest.fn()
  //     var renderedComponent = ReactTestUtils.renderIntoDocument(
  //       <I18nCurrencyInput value={"$1,234,567.89"} onChange={change} />
  //     ) as any;
  //     expect(renderedComponent.getMaskedValue()).toBe('$1,234,567.89')
  //     expect(change).toBeCalledWith(renderedComponent, '$1,234,567.89', 1234567.89, 123456789)
  //   });

  //   it('runs a change if the value property is changed and a correction is needed', function () {
  //     let change = jest.fn()
  //     let i18nRef = React.createRef<I18nCurrencyInput>()

  //     var renderedComponent = ReactTestUtils.renderIntoDocument(<UpdateWrapper initialValue={"$1,234,567.89"} render={(outerState) => {
  //       return <I18nCurrencyInput ref={i18nRef} value={outerState.value} onChange={change} />
  //     }} />
  //     ) as any as UpdateWrapper;
  //     change.mockClear()
  //     renderedComponent.setState({value:2})

  //     expect(i18nRef.current.getMaskedValue()).toBe('$2.00')
  //     expect(change).toBeCalledWith(i18nRef.current, '$2.00', 2, 200)
  //   });


  //   it('doesnt run a change if the value prop is set to the previous value', function () {
  //     let change = jest.fn()
  //     let i18nRef = React.createRef<I18nCurrencyInput>()


  //     var renderedComponent = ReactTestUtils.renderIntoDocument(<UpdateWrapper initialValue={"$1,234,567.89"} render={(outerState) => {
  //       return <I18nCurrencyInput ref={i18nRef} value={outerState.value} onChange={change} />
  //     }} />
  //     ) as any as UpdateWrapper;
  //     change.mockClear()
  //     renderedComponent.setState({value:'$1,234,567.89'})

  //     expect(i18nRef.current.getMaskedValue()).toBe('$1,234,567.89')
  //     expect(change).not.toBeCalled()
  //   });
  // });

  // describe('blur events', () => {
  //   let handleBlur: any
  //   beforeEach(function () {
  //     handleBlur = jest.fn()

  //     renderedComponent = ReactTestUtils.renderIntoDocument(
  //       <I18nCurrencyInput onBlur={handleBlur} value="0" />
  //     );

  //     inputComponent = ReactTestUtils.findRenderedDOMComponentWithTag(
  //       renderedComponent,
  //       'input'
  //     );
  //   });

  //   it('calls blur when the input is blurred', () => {
  //     ReactTestUtils.Simulate.focus(inputComponent)
  //     expect(handleBlur).not.toBeCalled()
  //     ReactTestUtils.Simulate.blur(inputComponent)
  //     expect(handleBlur).toBeCalledWith(renderedComponent)
  //   })
  // })





  // it('should correctly change between negative and positive numbers', function () {
  //   expect(renderedComponent.getMaskedValue()).toBe('$0.00');
  //   inputComponent.value = "123456"; ReactTestUtils.Simulate.change(inputComponent);
  //   expect(renderedComponent.getMaskedValue()).toBe('$1,234.56');
  //   inputComponent.value = "1,234.56-"; ReactTestUtils.Simulate.change(inputComponent);
  //   expect(renderedComponent.getMaskedValue()).toBe('-$1,234.56');
  //   inputComponent.value = "-1,234.56-"; ReactTestUtils.Simulate.change(inputComponent);
  //   expect(renderedComponent.getMaskedValue()).toBe('$1,234.56');
  //   inputComponent.value = "1-,234.56"; ReactTestUtils.Simulate.change(inputComponent);
  //   expect(renderedComponent.getMaskedValue()).toBe('-$1,234.56');
  //   inputComponent.value = "-1,234.-56"; ReactTestUtils.Simulate.change(inputComponent);
  //   expect(renderedComponent.getMaskedValue()).toBe('$1,234.56');
  // });





  // describe('requirePositive true', () => {
  //   let handleChange
  //   beforeEach(function () {
  //     handleChange = jest.fn()
  //     renderedComponent = ReactTestUtils.renderIntoDocument(
  //       <I18nCurrencyInput onChange={handleChange} value="0" requirePositive={true} />
  //     );

  //     inputComponent = ReactTestUtils.findRenderedDOMComponentWithTag(
  //       renderedComponent,
  //       'input'
  //     );

  //     inputComponent.value = "0";
  //     ReactTestUtils.Simulate.change(inputComponent);
  //   });

  //   it('should render 0 without negative sign', function () {
  //     expect(renderedComponent.getMaskedValue()).toBe('$0.00');
  //     inputComponent.value = "-0"; ReactTestUtils.Simulate.change(inputComponent);
  //     expect(renderedComponent.getMaskedValue()).toBe('$0.00');
  //   });

  //   it('should render number with no or even number of "-" as positive', function () {
  //     expect(renderedComponent.getMaskedValue()).toBe('$0.00');
  //     inputComponent.value = "123456"; ReactTestUtils.Simulate.change(inputComponent);
  //     expect(renderedComponent.getMaskedValue()).toBe('$1,234.56');
  //     inputComponent.value = "--123456"; ReactTestUtils.Simulate.change(inputComponent);
  //     expect(renderedComponent.getMaskedValue()).toBe('$1,234.56');
  //     inputComponent.value = "123--456"; ReactTestUtils.Simulate.change(inputComponent);
  //     expect(renderedComponent.getMaskedValue()).toBe('$1,234.56');
  //     inputComponent.value = "123456--"; ReactTestUtils.Simulate.change(inputComponent);
  //     expect(renderedComponent.getMaskedValue()).toBe('$1,234.56');
  //     inputComponent.value = "--123--456--"; ReactTestUtils.Simulate.change(inputComponent);
  //     expect(renderedComponent.getMaskedValue()).toBe('$1,234.56');
  //     inputComponent.value = "123456----"; ReactTestUtils.Simulate.change(inputComponent);
  //     expect(renderedComponent.getMaskedValue()).toBe('$1,234.56');
  //   });

  //   it('should render number with odd number of "-" as negative', function () {
  //     expect(renderedComponent.getMaskedValue()).toBe('$0.00');
  //     inputComponent.value = "-123456"; ReactTestUtils.Simulate.change(inputComponent);
  //     expect(renderedComponent.getMaskedValue()).toBe('$1,234.56');
  //     inputComponent.value = "123-456"; ReactTestUtils.Simulate.change(inputComponent);
  //     expect(renderedComponent.getMaskedValue()).toBe('$1,234.56');
  //     inputComponent.value = "123456-"; ReactTestUtils.Simulate.change(inputComponent);
  //     expect(renderedComponent.getMaskedValue()).toBe('$1,234.56');
  //     inputComponent.value = "-123-456-"; ReactTestUtils.Simulate.change(inputComponent);
  //     expect(renderedComponent.getMaskedValue()).toBe('$1,234.56');
  //   });

  //   it('should correctly change between negative and positive numbers', function () {
  //     expect(renderedComponent.getMaskedValue()).toBe('$0.00');
  //     inputComponent.value = "123456"; ReactTestUtils.Simulate.change(inputComponent);
  //     expect(renderedComponent.getMaskedValue()).toBe('$1,234.56');
  //     inputComponent.value = "1,234.56-"; ReactTestUtils.Simulate.change(inputComponent);
  //     expect(renderedComponent.getMaskedValue()).toBe('$1,234.56');
  //     inputComponent.value = "-1,234.56-"; ReactTestUtils.Simulate.change(inputComponent);
  //     expect(renderedComponent.getMaskedValue()).toBe('$1,234.56');
  //     inputComponent.value = "1-,234.56"; ReactTestUtils.Simulate.change(inputComponent);
  //     expect(renderedComponent.getMaskedValue()).toBe('$1,234.56');
  //     inputComponent.value = "-1,234.-56"; ReactTestUtils.Simulate.change(inputComponent);
  //     expect(renderedComponent.getMaskedValue()).toBe('$1,234.56');
  //   });
  // })
  // describe('input selection', function () {
  //   let defaultProps = {
  //     onChange: () => { },
  //     value: '0'
  //   };
  //   let divElem: any;
  //   let renderComponent = function (props = {}) {
  //     divElem = document.createElement('div');
  //     document.body.appendChild(divElem);

  //     const componentProps = { ...defaultProps, ...props };

  //     // we need tabIndex because jsdom won't focus a field without tabIndex
  //     const renderedComponent = ReactDOM.render(
  //       <I18nCurrencyInput {...componentProps} tabIndex="1" />,
  //       divElem
  //     ) as any;

  //     const inputComponent = ReactTestUtils.findRenderedDOMComponentWithTag(
  //       renderedComponent,
  //       'input'
  //     ) as HTMLInputElement;

  //     inputComponent.value = "0";
  //     ReactTestUtils.Simulate.change(inputComponent);
  //     //we need to run the focus function because jsdom won't change the activeElement if we don't
  //     inputComponent.focus()
  //     return { renderedComponent, inputComponent };
  //   };

  //   afterEach(function () {
  //     document.body.removeChild(divElem);
  //   });

  //   it('sanity - renders "$0.00"', function () {
  //     const { renderedComponent } = renderComponent();
  //     expect(renderedComponent.getMaskedValue()).toBe('$0.00');
  //   });

  //   it('should consider precision absence', function () {
  //     const { inputComponent } = renderComponent({ currency: 'JPY' });

  //     expect(inputComponent.selectionStart).toBe(0);
  //     expect(inputComponent.selectionEnd).toBe(0);
  //   });

  //   it('should move the caret to the end when requireNegative AND value was blank', () => {
  //     const { inputComponent } = renderComponent({ requireNegative: true })

  //     inputComponent.value = "";
  //     ReactTestUtils.Simulate.change(inputComponent);

  //     inputComponent.value = "9"
  //     ReactTestUtils.Simulate.change(inputComponent);

  //     expect(inputComponent.value).toBe("-$0.09")

  //     expect(inputComponent.selectionStart).toBe(6)
  //     expect(inputComponent.selectionEnd).toBe(6)
  //   })

  // });

  // it('exports MoneyFormatHelper properly', () => {
  //   expect(MoneyFormatHelper).toBe(ExportedHelper)
  // })

// });
